import { catchUpCents, shareByWeight } from "./allocate";
import {
  isArchived,
  isComplete,
  monthlyRateCents,
  remainingCents,
} from "./calc";
import { parseDate, toISODate } from "./dates";
import { projectionFor, simulateLumpSum, type Projection } from "./forecast";
import {
  CHALLENGE_TYPE_LABEL,
  type Challenge,
  type ChallengeCadence,
  type ChallengeType,
  type Contribution,
  type Goal,
} from "./schema";

/**
 * Challenges, derived.
 *
 * Nothing in this file writes and nothing here holds a balance. A challenge
 * carries a schedule; the ledger carries the money. Which steps are ticked,
 * how much has been saved and what it did to the goal are all read back out
 * of the contribution ledger, so the two can never disagree.
 *
 * Every figure routes through calc.ts and forecast.ts, so a challenge cannot
 * claim an effect the rest of the app would not.
 */

/* ── Schedule ────────────────────────────────────────────────────────────── */

const CADENCE_DAYS: Record<ChallengeCadence, number> = { weekly: 7, daily: 1 };

const STEP_WORD: Record<ChallengeCadence, string> = { weekly: "week", daily: "day" };

/** The noun for one step of this challenge — "week 14", "day 9". */
export const stepWord = (cadence: ChallengeCadence): string => STEP_WORD[cadence];

/**
 * Date-only arithmetic, parsed at local noon like everything else here, so a
 * timezone offset can never slide a step onto the day before.
 */
export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** When step n falls due. Plan information — not when it was paid. */
export const stepDueDate = (challenge: Challenge, step: number): string =>
  addDays(challenge.startDate, step * CADENCE_DAYS[challenge.cadence]);

export const cadenceOf = (type: ChallengeType): ChallengeCadence =>
  type === "goal-sprint" ? "daily" : "weekly";

/** A sprint is 30 days in V1. */
export const SPRINT_DAYS = 30;

/** 100 × (52 × 53 ÷ 2). Both 52-week challenges land here. */
export const FIFTY_TWO_WEEK_TOTAL_CENTS = 137_800;

export type ChallengeSpec =
  | { type: "52-week" }
  | { type: "reverse-52" }
  | { type: "custom-weekly"; targetCents: number; weeks: number }
  | { type: "goal-sprint"; targetCents: number; days: number };

/**
 * The schedule for a challenge, in cents.
 *
 * The two fixed challenges are the classic ladders. The two customisable ones
 * split their target with `shareByWeight` — the same exact-sharing function
 * Smart Allocation uses, which floors every share and hands the leftover cents
 * out one at a time. The steps therefore total the target precisely: no cent
 * is lost and none is invented.
 */
export function generateSteps(spec: ChallengeSpec): number[] {
  switch (spec.type) {
    case "52-week":
      return Array.from({ length: 52 }, (_, i) => (i + 1) * 100);
    case "reverse-52":
      return Array.from({ length: 52 }, (_, i) => (52 - i) * 100);
    case "custom-weekly":
      return spec.weeks > 0
        ? shareByWeight(spec.targetCents, Array<number>(spec.weeks).fill(1))
        : [];
    case "goal-sprint":
      return spec.days > 0
        ? shareByWeight(spec.targetCents, Array<number>(spec.days).fill(1))
        : [];
  }
}

/** What the plan asks for in total. */
export const plannedTotalCents = (challenge: Challenge): number =>
  challenge.stepCents.reduce((sum, cents) => sum + cents, 0);

export const defaultChallengeName = (type: ChallengeType): string =>
  CHALLENGE_TYPE_LABEL[type];

/** Written onto the contribution so the ledger row reads sensibly on its own. */
export const stepNote = (challenge: Challenge, step: number): string =>
  `${challenge.name} · ${stepWord(challenge.cadence)} ${step + 1}`;

/* ── Reading the ledger back ─────────────────────────────────────────────── */

/** Every contribution this challenge has recorded. */
export const challengeContributions = (
  challengeId: string,
  contributions: Contribution[],
): Contribution[] =>
  contributions.filter((c) => c.source?.challengeId === challengeId);

/**
 * Step index to the contribution that recorded it. The first match wins, so a
 * dataset that somehow holds two rows for one step still reads as one step.
 */
export function stepContributions(
  challengeId: string,
  contributions: Contribution[],
): Map<number, Contribution> {
  const byStep = new Map<number, Contribution>();
  for (const c of contributions) {
    const source = c.source;
    if (!source || source.challengeId !== challengeId) continue;
    if (!byStep.has(source.step)) byStep.set(source.step, c);
  }
  return byStep;
}

export interface ChallengeProgress {
  /** What the ledger actually holds for this challenge. */
  savedCents: number;
  /** What the schedule asks for. */
  plannedCents: number;
  stepsDone: number;
  totalSteps: number;
  /** Still to save under the plan. Never negative. */
  remainingCents: number;
  complete: boolean;
  byStep: Map<number, Contribution>;
  /** Steps whose recorded amount no longer matches the plan. */
  adjustedSteps: number[];
  /** The next step with nothing against it, or null when every step is done. */
  nextStep: number | null;
}

/**
 * Progress read entirely out of the ledger.
 *
 * `savedCents` deliberately sums the real contributions rather than the plan
 * amounts of the ticked steps: if a customer corrects a row on the goal's
 * history page, the challenge reports what they actually saved.
 */
export function challengeProgress(
  challenge: Challenge,
  contributions: Contribution[],
): ChallengeProgress {
  const byStep = stepContributions(challenge.id, contributions);
  const savedCents = challengeContributions(challenge.id, contributions).reduce(
    (sum, c) => sum + c.amountCents,
    0,
  );
  const plannedCents = plannedTotalCents(challenge);
  const totalSteps = challenge.stepCents.length;

  let stepsDone = 0;
  let nextStep: number | null = null;
  const adjustedSteps: number[] = [];
  for (let i = 0; i < totalSteps; i++) {
    const recorded = byStep.get(i);
    if (!recorded) {
      nextStep ??= i;
      continue;
    }
    stepsDone++;
    if (recorded.amountCents !== challenge.stepCents[i]) adjustedSteps.push(i);
  }

  return {
    savedCents,
    plannedCents,
    stepsDone,
    totalSteps,
    remainingCents: Math.max(plannedCents - savedCents, 0),
    complete: totalSteps > 0 && stepsDone === totalSteps,
    byStep,
    adjustedSteps,
    nextStep,
  };
}

/* ── Eligibility ─────────────────────────────────────────────────────────── */

/** Why a goal cannot take a new challenge. Always a stated fact, never a score. */
export type ChallengeIneligibility =
  | "archived"
  | "no-target"
  | "complete"
  | "has-challenge";

export function challengeIneligibility(
  goal: Goal,
  contributions: Contribution[],
  challenges: Challenge[],
): ChallengeIneligibility | null {
  if (isArchived(goal)) return "archived";
  if (goal.targetCents <= 0) return "no-target";
  if (isComplete(goal, contributions)) return "complete";
  if (challenges.some((c) => c.goalId === goal.id && !c.archivedAt))
    return "has-challenge";
  return null;
}

export const eligibleGoalsForChallenge = (
  goals: Goal[],
  contributions: Contribution[],
  challenges: Challenge[],
): Goal[] =>
  goals.filter((g) => challengeIneligibility(g, contributions, challenges) === null);

/**
 * Why the next step cannot be ticked right now.
 *
 * A funded goal stops its challenge rather than letting it push the balance
 * past the target: the point of a challenge is to move a goal closer, and
 * there is nowhere closer to go. Existing steps are untouched, and unticking
 * stays available so a mistake can always be undone.
 */
export type TickBlock =
  | "challenge-archived"
  | "goal-missing"
  | "goal-archived"
  | "goal-funded";

export function tickBlock(
  challenge: Challenge,
  goal: Goal | undefined,
  contributions: Contribution[],
): TickBlock | null {
  if (challenge.archivedAt) return "challenge-archived";
  if (!goal) return "goal-missing";
  if (isArchived(goal)) return "goal-archived";
  if (isComplete(goal, contributions)) return "goal-funded";
  return null;
}

/* ── Effect on the goal ──────────────────────────────────────────────────── */

/** Months a projection represents. Complete is zero; unprojectable is null. */
const monthsOf = (projection: Projection): number | null =>
  projection.kind === "complete"
    ? 0
    : projection.kind === "projected"
      ? projection.months
      : null;

export interface ChallengeImpact {
  /** The goal as it would stand without a cent of this challenge. */
  before: Projection;
  /** The goal as it stands. */
  after: Projection;
  /** Whole months brought forward so far. Null when either side cannot project. */
  monthsSaved: number | null;
  /** Where the goal lands if every remaining step is ticked. */
  ifFinished: Projection;
  /** Further months that finishing would bring forward, from where it is now. */
  ifFinishedExtraMonths: number | null;
  savedCents: number;
  remainingCents: number;
}

/**
 * What this challenge has done to its goal, and what finishing it would do.
 *
 * Both sides come from `projectionFor`, and the remainder is modelled with the
 * existing lump-sum scenario — so the number here is the same number the
 * Forecast and What If pages would give. Durations are whole months because
 * that is the precision `monthsToClear` actually has; no finer unit is
 * manufactured from it.
 */
export function challengeImpact(
  challenge: Challenge,
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): ChallengeImpact {
  const progress = challengeProgress(challenge, contributions);
  const without = contributions.filter(
    (c) => c.source?.challengeId !== challenge.id,
  );

  const before = projectionFor(goal, without, now);
  const after = projectionFor(goal, contributions, now);
  const finished = simulateLumpSum(goal, contributions, progress.remainingCents, now);

  const beforeMonths = monthsOf(before);
  const afterMonths = monthsOf(after);
  const finishedMonths = monthsOf(finished.scenario);

  return {
    before,
    after,
    monthsSaved:
      beforeMonths !== null && afterMonths !== null
        ? Math.max(beforeMonths - afterMonths, 0)
        : null,
    ifFinished: finished.scenario,
    ifFinishedExtraMonths:
      afterMonths !== null && finishedMonths !== null
        ? Math.max(afterMonths - finishedMonths, 0)
        : null,
    savedCents: progress.savedCents,
    remainingCents: progress.remainingCents,
  };
}

/* ── Goal Sprint ─────────────────────────────────────────────────────────── */

/**
 * The suggested 30-day sprint target — a starting point the customer edits,
 * not a recommendation the app insists on.
 *
 * One month of the goal's own plan, plus up to one further month towards
 * whatever it is behind by, and never more than the goal still needs. Capping
 * the catch-up at a month matters: a badly behind goal would otherwise be
 * handed its entire shortfall as a 30-day target, which reads as a telling-off
 * rather than a challenge.
 *
 * Null when the goal has no planned rate at all — there is no honest figure to
 * derive, so the customer names one.
 */
export function sprintDefaultCents(
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): number | null {
  const monthly = monthlyRateCents(goal);
  if (monthly <= 0) return null;
  const extra = Math.min(catchUpCents(goal, contributions, now), monthly);
  return Math.min(remainingCents(goal, contributions), monthly + extra);
}

/* ── Selecting ───────────────────────────────────────────────────────────── */

export const activeChallenges = (challenges: Challenge[]): Challenge[] =>
  challenges.filter((c) => !c.archivedAt);

export const challengesForGoal = (
  goalId: string,
  challenges: Challenge[],
): Challenge[] => challenges.filter((c) => c.goalId === goalId);

/**
 * The one worth featuring on the dashboard: the oldest active challenge still
 * having steps left, falling back to the oldest active one. Ordered by
 * creation and then id, so the dashboard does not reshuffle between renders.
 */
export function featuredChallenge(
  challenges: Challenge[],
  contributions: Contribution[],
): Challenge | null {
  const active = [...activeChallenges(challenges)].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  return (
    active.find((c) => !challengeProgress(c, contributions).complete) ??
    active[0] ??
    null
  );
}

export { CHALLENGE_TYPE_LABEL };
