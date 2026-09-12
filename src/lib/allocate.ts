import {
  isArchived,
  isComplete,
  monthlyRateCents,
  remainingCents,
  statusOf,
} from "./calc";
import { monthsAgainstTarget, portfolioSummary, projectionFor, type Projection, type PortfolioSummary } from "./forecast";
import { addMonths, parseDate, toISODate } from "./dates";
import type { Contribution, Goal, Priority } from "./schema";

/**
 * Smart Allocation — "I've got some extra money, where should I put it?"
 *
 * A deterministic planning tool, not advice and not a model. Same inputs
 * always produce the same plan. Nothing here writes; applying a plan is a
 * separate, explicit action.
 *
 * The whole method is three ideas:
 *
 *   1. CATCH-UP — for a goal with a target date, the lump sum that would put
 *      it back on schedule today. A concrete amount, not a score.
 *   2. WEIGHT — how loudly a goal is asking for help, from three plain
 *      factors: its priority, how near its deadline is, and whether it is
 *      behind or comfortably ahead.
 *   3. TWO PASSES — first help the goals that are behind, capped at what each
 *      needs to catch up; then spread what is left across everything, capped
 *      at what each still needs.
 *
 * Notice what is *not* a factor: how big a goal's target is. Money is shared
 * by weight and capped by need, so a goal can never win a larger share simply
 * for being expensive.
 */

/* ── Weighting ───────────────────────────────────────────────────────────── */

/**
 * Weights are held as whole numbers, ten times their nominal value, so every
 * weight is an exact integer and no float comparison can wobble.
 *
 * Nominal values:
 *   priority   high 3    · medium 2  · low 1
 *   deadline   ≤6mo 3    · ≤12mo 2.5 · ≤24mo 2 · ≤48mo 1.5 · beyond 1 · none 1
 *   schedule   behind 2  · on track 1 · comfortably ahead 0.5
 */
const PRIORITY_WEIGHT: Record<Priority, number> = { high: 30, medium: 20, low: 10 };

const deadlineWeight = (monthsToTarget: number | null): number => {
  if (monthsToTarget === null) return 10;
  if (monthsToTarget <= 6) return 30;
  if (monthsToTarget <= 12) return 25;
  if (monthsToTarget <= 24) return 20;
  if (monthsToTarget <= 48) return 15;
  return 10;
};

const scheduleWeight = (behind: boolean, comfortablyAhead: boolean): number =>
  behind ? 20 : comfortablyAhead ? 5 : 10;

/** A goal counts as comfortably ahead at three clear months of headroom. */
const AHEAD_MONTHS = 3;

/**
 * The most of the money that the catch-up pass may take.
 *
 * Goals that are behind get stronger weighting, not absolute priority. Without
 * this cap a single badly-behind goal absorbs everything — its catch-up need
 * can be many times the amount available — and every other goal is handed
 * nothing. Holding back a share means the plan always spreads, which is both
 * more useful and easier to explain.
 */
const CATCH_UP_SHARE = 0.7;

/* ── Facts about a goal, computed once ───────────────────────────────────── */

/** Whole months that fit between now and a date. Null when there is no date. */
export function monthsUntil(dateISO: string | undefined, now: Date): number | null {
  if (!dateISO) return null;
  const target = parseDate(dateISO).getTime();
  if (target < parseDate(toISODate(now)).getTime()) return 0;
  let months = 0;
  while (months < 1200 && parseDate(toISODate(addMonths(now, months + 1))).getTime() <= target) {
    months++;
  }
  return months;
}

/**
 * The lump sum that would put a goal back on schedule today.
 *
 * On-track means the remaining balance can be cleared by the target date at
 * the goal's own rate, so the shortfall is whatever the rate will not cover
 * in the months available.
 */
export function catchUpCents(
  goal: Goal,
  contributions: Contribution[],
  now: Date,
): number {
  const remaining = remainingCents(goal, contributions);
  if (remaining <= 0) return 0;

  const months = monthsUntil(goal.targetDate, now);
  // No target date means nothing to be late for.
  if (months === null) return 0;

  const covered = monthlyRateCents(goal) * months;
  return Math.max(0, remaining - covered);
}

/* ── Result shapes ───────────────────────────────────────────────────────── */

/** Why a goal was left out. Never a score — always a stated fact. */
export type Ineligibility = "complete" | "archived" | "no-target";

/** Why a goal received what it received. */
export type AllocationReason =
  | "completes-goal"
  | "back-on-track"
  | "catch-up-partial"
  | "deadline-soon"
  | "high-priority"
  | "small-top-up"
  | "ahead-of-plan"
  | "steady-share"
  | "nothing-left";

export interface AllocationFactors {
  behind: boolean;
  comfortablyAhead: boolean;
  priority: Priority;
  monthsToTarget: number | null;
  catchUpCents: number;
  remainingCents: number;
}

export interface Allocation {
  goalId: string;
  name: string;
  emoji?: string;
  amountCents: number;
  eligible: boolean;
  reason: AllocationReason | Ineligibility;
  factors: AllocationFactors;
  before: Projection;
  after: Projection;
  /** Months brought forward by this allocation. Null when not projectable. */
  impactMonths: number | null;
  /** True when this allocation moves the goal from behind to on track. */
  backOnTrack: boolean;
  /** True when this allocation finishes the goal outright. */
  completesGoal: boolean;
}

export interface AllocationPlan {
  availableCents: number;
  /** Eligible goals first, then the ones that were considered and excluded. */
  allocations: Allocation[];
  totalAllocatedCents: number;
  /** Money with nowhere sensible to go. Shown, never silently dropped. */
  unallocatedCents: number;
  before: PortfolioSummary;
  after: PortfolioSummary;
  /** Goals moved from behind to on track. */
  backOnTrackCount: number;
  /** Total months brought forward across every goal. */
  monthsSaved: number;
}

/* ── Exact sharing ───────────────────────────────────────────────────────── */

/**
 * Split a whole number of cents by weight, exactly. Floors each share, then
 * hands out the leftover cents one at a time to the largest fractional parts,
 * ties broken by position — so the total always lands precisely on `total`
 * and no cent is ever lost or invented.
 */
export function shareByWeight(total: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || totalWeight <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (total * w) / totalWeight);
  const out = exact.map((e) => Math.floor(e));
  const leftover = total - out.reduce((a, b) => a + b, 0);

  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; k < leftover && k < order.length; k++) out[order[k].i] += 1;
  return out;
}

interface Bucket {
  id: string;
  weight: number;
  cap: number;
}

/**
 * Share a pool across buckets by weight, never exceeding any bucket's cap.
 * A bucket that would overflow is filled to its cap and its excess returns to
 * the pool for the next round, so the money keeps moving until it is either
 * spent or genuinely has nowhere to go.
 */
function distribute(
  pool: number,
  buckets: Bucket[],
): { assigned: Map<string, number>; leftover: number } {
  const assigned = new Map<string, number>(buckets.map((b) => [b.id, 0]));
  let remaining = Math.max(pool, 0);

  // Each round either caps at least one bucket or finishes the split, so this
  // terminates in at most one round per bucket.
  for (let round = 0; round <= buckets.length && remaining > 0; round++) {
    const active = buckets.filter(
      (b) => b.weight > 0 && b.cap - assigned.get(b.id)! > 0,
    );
    if (active.length === 0) break;

    const totalWeight = active.reduce((s, b) => s + b.weight, 0);
    let cappedAny = false;

    for (const b of active) {
      const headroom = b.cap - assigned.get(b.id)!;
      if ((remaining * b.weight) / totalWeight >= headroom) {
        assigned.set(b.id, b.cap);
        remaining -= headroom;
        cappedAny = true;
      }
    }
    if (cappedAny) continue;

    const shares = shareByWeight(remaining, active.map((b) => b.weight));
    active.forEach((b, i) => assigned.set(b.id, assigned.get(b.id)! + shares[i]));
    remaining = 0;
  }

  return { assigned, leftover: remaining };
}

/* ── The plan ────────────────────────────────────────────────────────────── */

interface Candidate {
  goal: Goal;
  weight: number;
  factors: AllocationFactors;
}

/**
 * Contributions the plan *would* create. Never written — used only to run the
 * existing forecast over a hypothetical future.
 */
export function plannedContributions(
  allocations: Allocation[],
  now: Date,
): Contribution[] {
  const date = toISODate(now);
  return allocations
    .filter((a) => a.amountCents > 0)
    .map((a) => ({
      id: `planned-${a.goalId}`,
      goalId: a.goalId,
      amountCents: a.amountCents,
      date,
      note: ALLOCATION_NOTE,
      createdAt: now.toISOString(),
    }));
}

/** Written onto real contributions when a plan is applied. */
export const ALLOCATION_NOTE = "Smart Allocation";

interface Considered {
  candidates: Candidate[];
  excluded: Array<{ goal: Goal; reason: Ineligibility }>;
}

/** Who is eligible, who is not, and the facts about each. */
function consider(goals: Goal[], contributions: Contribution[], now: Date): Considered {
  const excluded: Array<{ goal: Goal; reason: Ineligibility }> = [];
  const candidates: Candidate[] = [];

  for (const goal of goals) {
    if (isArchived(goal)) {
      excluded.push({ goal, reason: "archived" });
      continue;
    }
    if (goal.targetCents <= 0) {
      excluded.push({ goal, reason: "no-target" });
      continue;
    }
    if (isComplete(goal, contributions)) {
      excluded.push({ goal, reason: "complete" });
      continue;
    }

    const projection = projectionFor(goal, contributions, now);
    const against = monthsAgainstTarget(goal, projection);
    const behind = statusOf(goal, contributions, now) === "behind";
    const comfortablyAhead = !behind && against !== null && against >= AHEAD_MONTHS;
    const monthsToTarget = monthsUntil(goal.targetDate, now);

    candidates.push({
      goal,
      weight:
        PRIORITY_WEIGHT[goal.priority] *
        deadlineWeight(monthsToTarget) *
        scheduleWeight(behind, comfortablyAhead),
      factors: {
        behind,
        comfortablyAhead,
        priority: goal.priority,
        monthsToTarget,
        catchUpCents: catchUpCents(goal, contributions, now),
        remainingCents: remainingCents(goal, contributions),
      },
    });
  }

  /*
   * A fixed order, so an identical set of goals always produces an identical
   * plan. The goal id is the final tiebreak, which makes even two otherwise
   * indistinguishable goals split predictably.
   */
  candidates.sort(
    (a, b) =>
      b.weight - a.weight ||
      (a.factors.monthsToTarget ?? Number.MAX_SAFE_INTEGER) -
        (b.factors.monthsToTarget ?? Number.MAX_SAFE_INTEGER) ||
      a.goal.targetDate.localeCompare(b.goal.targetDate) ||
      a.goal.name.localeCompare(b.goal.name) ||
      a.goal.id.localeCompare(b.goal.id),
  );

  return { candidates, excluded };
}

/**
 * Turn a set of amounts into a full plan — the projections on each side, the
 * reasons, and the portfolio summaries. Shared by the recommendation and by
 * any amounts the customer has adjusted by hand, so an edited plan is
 * described exactly as carefully as a suggested one.
 */
function buildPlan(
  goals: Goal[],
  contributions: Contribution[],
  considered: Considered,
  amounts: Map<string, number>,
  availableCents: number,
  now: Date,
): AllocationPlan {
  const { candidates, excluded } = considered;

  const allocations: Allocation[] = candidates.map((c) => {
    const amountCents = Math.max(
      Math.min(amounts.get(c.goal.id) ?? 0, c.factors.remainingCents),
      0,
    );
    return {
      goalId: c.goal.id,
      name: c.goal.name,
      emoji: c.goal.emoji,
      amountCents,
      eligible: true,
      reason: "steady-share",
      factors: c.factors,
      before: projectionFor(c.goal, contributions, now),
      after: projectionFor(c.goal, contributions, now),
      impactMonths: null,
      backOnTrack: false,
      completesGoal:
        amountCents >= c.factors.remainingCents && c.factors.remainingCents > 0,
    };
  });

  /* Run the existing forecast over the hypothetical future. */
  const planned = plannedContributions(allocations, now);
  const after = [...contributions, ...planned];

  for (const allocation of allocations) {
    const goal = candidates.find((c) => c.goal.id === allocation.goalId)!.goal;
    allocation.after = projectionFor(goal, after, now);
    allocation.impactMonths =
      allocation.before.kind === "projected" && allocation.after.kind === "projected"
        ? Math.max(allocation.before.months - allocation.after.months, 0)
        : allocation.before.kind === "projected" && allocation.after.kind === "complete"
          ? allocation.before.months
          : null;
    allocation.backOnTrack =
      allocation.factors.behind &&
      allocation.amountCents > 0 &&
      (allocation.after.kind === "complete" ||
        (allocation.after.kind === "projected" && allocation.after.onTrack));
    allocation.reason = reasonFor(allocation);
  }

  /* The goals that were considered and set aside. */
  for (const { goal, reason } of excluded) {
    const projection = projectionFor(goal, contributions, now);
    allocations.push({
      goalId: goal.id,
      name: goal.name,
      emoji: goal.emoji,
      amountCents: 0,
      eligible: false,
      reason,
      factors: {
        behind: false,
        comfortablyAhead: false,
        priority: goal.priority,
        monthsToTarget: monthsUntil(goal.targetDate, now),
        catchUpCents: 0,
        remainingCents: Math.max(remainingCents(goal, contributions), 0),
      },
      before: projection,
      after: projection,
      impactMonths: null,
      backOnTrack: false,
      completesGoal: false,
    });
  }

  const totalAllocatedCents = allocations.reduce((s, a) => s + a.amountCents, 0);

  return {
    availableCents,
    allocations,
    totalAllocatedCents,
    unallocatedCents: availableCents - totalAllocatedCents,
    before: portfolioSummary(goals, contributions, now),
    after: portfolioSummary(goals, after, now),
    backOnTrackCount: allocations.filter((a) => a.backOnTrack).length,
    monthsSaved: allocations.reduce((s, a) => s + (a.impactMonths ?? 0), 0),
  };
}

const sanitise = (cents: number): number =>
  Number.isFinite(cents) ? Math.max(Math.floor(cents), 0) : 0;

/** The recommendation. */
export function smartAllocate(
  goals: Goal[],
  contributions: Contribution[],
  availableCents: number,
  now: Date = new Date(),
): AllocationPlan {
  const available = sanitise(availableCents);
  const considered = consider(goals, contributions, now);
  const { candidates } = considered;

  /* Pass 1 — help the goals that are behind, up to what they need to catch up. */
  const behindBuckets: Bucket[] = candidates
    .filter((c) => c.factors.behind && c.factors.catchUpCents > 0)
    .map((c) => ({
      id: c.goal.id,
      weight: c.weight,
      cap: Math.min(c.factors.catchUpCents, c.factors.remainingCents),
    }));

  const catchUpPool = Math.floor(available * CATCH_UP_SHARE);
  const pass1 = distribute(catchUpPool, behindBuckets);
  const usedOnCatchUp = catchUpPool - pass1.leftover;

  /* Pass 2 — spread everything else, up to what each goal still needs. */
  const pass2 = distribute(
    available - usedOnCatchUp,
    candidates.map((c) => ({
      id: c.goal.id,
      weight: c.weight,
      cap: c.factors.remainingCents - (pass1.assigned.get(c.goal.id) ?? 0),
    })),
  );

  const amounts = new Map<string, number>();
  for (const c of candidates) {
    amounts.set(
      c.goal.id,
      (pass1.assigned.get(c.goal.id) ?? 0) + (pass2.assigned.get(c.goal.id) ?? 0),
    );
  }

  return buildPlan(goals, contributions, considered, amounts, available, now);
}

/**
 * The same plan shape, from amounts the customer chose. Used when a
 * recommendation has been adjusted by hand — the before/after preview and the
 * reasons stay just as accurate.
 */
export function planFromAmounts(
  goals: Goal[],
  contributions: Contribution[],
  amountsById: Record<string, number>,
  availableCents: number,
  now: Date = new Date(),
): AllocationPlan {
  const amounts = new Map<string, number>(
    Object.entries(amountsById).map(([id, cents]) => [id, sanitise(cents)]),
  );
  return buildPlan(
    goals,
    contributions,
    consider(goals, contributions, now),
    amounts,
    sanitise(availableCents),
    now,
  );
}

/**
 * The single most useful thing to say about this allocation, chosen in order
 * of what a person would most want to hear. The weight never appears — only
 * the fact behind it.
 */
function reasonFor(a: Allocation): AllocationReason {
  if (a.amountCents <= 0) {
    return a.factors.comfortablyAhead ? "ahead-of-plan" : "nothing-left";
  }
  if (a.completesGoal) return "completes-goal";
  if (a.backOnTrack) return "back-on-track";
  if (a.factors.behind) return "catch-up-partial";
  if (a.factors.comfortablyAhead) return "ahead-of-plan";
  if (a.amountCents >= a.factors.remainingCents * 0.9) return "small-top-up";
  if (a.factors.monthsToTarget !== null && a.factors.monthsToTarget <= 12) {
    return "deadline-soon";
  }
  if (a.factors.priority === "high") return "high-priority";
  return "steady-share";
}
