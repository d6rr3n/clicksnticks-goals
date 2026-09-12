import { money } from "./money";
import { monthYear } from "./dates";
import { FREQUENCY_LABEL, type ChallengeCadence, type Frequency, type Goal } from "./schema";
import type { Allocation, AllocationPlan } from "./allocate";
import type {
  ChallengeImpact,
  ChallengeIneligibility,
  ChallengeProgress,
  TickBlock,
} from "./challenges";
import type {
  ExtraScenario,
  LumpSumScenario,
  PortfolioSummary,
  Projection,
  RequiredRate,
} from "./forecast";

/**
 * Plain-language explanations built from real numbers. Every sentence here is
 * a deterministic function of the calculation — nothing is generated, guessed
 * or phrased by a model. The customer should understand the answer before they
 * understand the mathematics.
 */

/** "3 months", "1 year", "1 year 2 months". */
export function describeMonths(months: number): string {
  const n = Math.max(Math.round(months), 0);
  if (n === 0) return "no time at all";
  if (n < 12) return `${n} month${n === 1 ? "" : "s"}`;
  const years = Math.floor(n / 12);
  const rest = n % 12;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  return rest === 0 ? y : `${y} ${rest} month${rest === 1 ? "" : "s"}`;
}

const perPeriod = (frequency: Frequency): string =>
  frequency === "weekly" ? "week" : frequency === "fortnightly" ? "fortnight" : "month";

export const rateSentence = (cents: number, frequency: Frequency): string =>
  `${money(cents)} a ${perPeriod(frequency)}`;

/* ── A goal's own projection ─────────────────────────────────────────────── */

export function explainProjection(goal: Goal, projection: Projection): string {
  if (projection.kind === "complete") {
    return `${goal.name} is fully funded. Nothing more to do here.`;
  }
  if (projection.kind === "unable") {
    return `There's no regular contribution set for ${goal.name} yet, so we can't work out a completion date. Add one and this fills in.`;
  }

  const landing = monthYear(projection.date);
  const target = monthYear(goal.targetDate);

  if (landing === target) {
    return `At your current rate you'll reach this in ${landing} — right on target.`;
  }
  return projection.onTrack
    ? `At your current rate you'll reach this in ${landing}, ahead of your ${target} target.`
    : `At your current rate you'll reach this in ${landing}, which is after your ${target} target.`;
}

/** The short version: how far ahead or behind the goal's own target it lands. */
export function explainAgainstTarget(
  projection: Projection,
  monthsAgainst: number | null,
): string | null {
  if (projection.kind !== "projected" || monthsAgainst === null) return null;
  if (monthsAgainst === 0) return "Landing in your target month.";
  return monthsAgainst > 0
    ? `About ${describeMonths(monthsAgainst)} early.`
    : `About ${describeMonths(-monthsAgainst)} late.`;
}

/* ── Scenario A: save more ───────────────────────────────────────────────── */

export function explainExtra(
  goal: Goal,
  extra: { amountCents: number; frequency: Frequency },
  result: ExtraScenario,
): string {
  if (result.baseline.kind === "complete") {
    return `${goal.name} is already fully funded, so there's nothing left to bring forward.`;
  }
  if (extra.amountCents <= 0) {
    return result.baseline.kind === "projected"
      ? `This is your current plan: ${monthYear(result.baseline.date)}.`
      : `Set a regular contribution and we can show what extra saving would do.`;
  }
  if (result.baseline.kind === "unable") {
    return result.scenario.kind === "projected"
      ? `Saving ${rateSentence(extra.amountCents, extra.frequency)} would get you there by ${monthYear(result.scenario.date)}. At the moment there's no contribution set at all.`
      : `Add a regular contribution and we can project a date.`;
  }
  if (result.scenario.kind !== "projected" || result.monthsSaved === null) {
    return `That wouldn't change your completion date.`;
  }
  if (result.monthsSaved === 0) {
    return `An extra ${rateSentence(extra.amountCents, extra.frequency)} isn't quite enough to bring ${monthYear(result.baseline.date)} forward a whole month.`;
  }
  return `Saving an extra ${rateSentence(extra.amountCents, extra.frequency)} brings ${goal.name} forward by about ${describeMonths(result.monthsSaved)} — from ${monthYear(result.baseline.date)} to ${monthYear(result.scenario.date)}.`;
}

/* ── Scenario B: lump sum ────────────────────────────────────────────────── */

export function explainLumpSum(
  goal: Goal,
  amountCents: number,
  result: LumpSumScenario,
): string {
  if (result.baseline.kind === "complete") {
    return `${goal.name} is already fully funded.`;
  }
  if (amountCents <= 0) {
    return `Enter an amount to see what a one-off payment would do.`;
  }
  if (result.completesGoal) {
    return `${money(amountCents)} today would finish ${goal.name} outright.`;
  }
  if (result.scenario.kind === "unable") {
    return `${money(amountCents)} today would take you to ${Math.round(result.newPercentComplete * 100)}% of ${goal.name}. There's no regular contribution set, so we still can't project a finish date.`;
  }
  if (result.monthsSaved === null || result.monthsSaved === 0) {
    return `${money(amountCents)} today takes you to ${Math.round(result.newPercentComplete * 100)}%, though not quite enough to pull the date forward a whole month.`;
  }
  return `${money(amountCents)} today brings ${goal.name} forward by about ${describeMonths(result.monthsSaved)}, and takes you to ${Math.round(result.newPercentComplete * 100)}% complete.`;
}

/** Never fabricate a contribution — point at the real way to record one. */
export const LUMP_SUM_NOTE =
  "This is a what-if only. If you do put this money in, record it with Quick Add so your history stays accurate.";

/* ── Scenario C: reach it by ─────────────────────────────────────────────── */

export function explainRequired(
  goal: Goal,
  byDateISO: string,
  result: RequiredRate,
  frequency: Frequency,
): string {
  if (result.kind === "already-complete") {
    return `${goal.name} is already fully funded.`;
  }
  if (result.kind === "unreachable") {
    return result.reason === "date-passed"
      ? `That date has already passed. Choose a date in the future.`
      : `That's less than a month away, so there isn't time for a regular contribution to get there. A one-off payment is the only way to make that date.`;
  }

  const need =
    frequency === "weekly"
      ? result.required.weeklyCents
      : frequency === "fortnightly"
        ? result.required.fortnightlyCents
        : result.required.monthlyCents;
  const delta =
    frequency === "weekly"
      ? result.deltaWeeklyCents
      : frequency === "fortnightly"
        ? result.deltaFortnightlyCents
        : result.deltaMonthlyCents;

  const head = `To reach ${goal.name} by ${monthYear(byDateISO)} you'd need about ${rateSentence(need, frequency)}.`;

  if (result.alreadyEnough) {
    return `${head} You're already saving enough — ${rateSentence(Math.abs(delta), frequency)} more than you need.`;
  }
  return `${head} That's ${rateSentence(delta, frequency)} more than you're saving now.`;
}

/* ── Portfolio ───────────────────────────────────────────────────────────── */

/**
 * A handful of short observations about the whole plan. Ordered so the most
 * useful sits first, and capped so the page never turns into a lecture.
 */
export function portfolioNotes(summary: PortfolioSummary, max = 3): string[] {
  const notes: string[] = [];

  if (summary.activeCount === 0) {
    return ["Add a goal and your forecast will appear here."];
  }

  if (summary.nextToComplete) {
    notes.push(
      `${summary.nextToComplete.name} is your next goal to land, projected for ${monthYear(summary.nextToComplete.date)}.`,
    );
  }

  if (summary.unprojectableCount > 0) {
    notes.push(
      summary.unprojectableCount === 1
        ? `One goal has no regular contribution set, so it isn't included in the projection.`
        : `${summary.unprojectableCount} goals have no regular contribution set, so they aren't included in the projection.`,
    );
  }

  const behind = summary.activeCount - summary.onTrackCount;
  if (behind > 0) {
    notes.push(
      behind === 1
        ? `One goal is currently projected to finish after its target date.`
        : `${behind} goals are currently projected to finish after their target dates.`,
    );
  } else if (summary.completedCount < summary.activeCount) {
    notes.push(`Every goal is currently projected to land on or before its target date.`);
  }

  if (
    summary.latestToComplete &&
    summary.nextToComplete &&
    summary.latestToComplete.goalId !== summary.nextToComplete.goalId
  ) {
    notes.push(
      `${summary.latestToComplete.name} is your longest run, projected for ${monthYear(summary.latestToComplete.date)}.`,
    );
  }

  if (summary.truncated) {
    notes.push(
      `At least one goal runs past the end of this forecast at its current rate.`,
    );
  }

  return notes.slice(0, max);
}

/* ── Smart Allocation ────────────────────────────────────────────────────── */

/**
 * Why a goal got what it got, in one line. The engine's weighting never
 * surfaces as a number — only the fact behind it, so the customer can see
 * that their money followed their own priorities and deadlines.
 */
/**
 * The goals actually being caught up by this plan, other than this one.
 * Derived from the plan, never hardcoded, so the sentence stays true whichever
 * goals happen to be behind.
 */
function catchingUpNames(
  plan: AllocationPlan | undefined,
  exceptGoalId: string,
): string[] {
  if (!plan) return [];
  return plan.allocations
    .filter(
      (a) =>
        a.eligible &&
        a.factors.behind &&
        a.amountCents > 0 &&
        a.goalId !== exceptGoalId,
    )
    .map((a) => a.name);
}

export function explainAllocation(
  allocation: Allocation,
  plan?: AllocationPlan,
): string {
  const { reason, factors, impactMonths, name } = allocation;

  switch (reason) {
    case "complete":
      return "Already fully funded.";
    case "archived":
      return "Archived goals aren't included.";
    case "no-target":
      return "No target amount set, so there's nothing to work towards yet.";

    case "completes-goal":
      return `This finishes ${name} outright.`;

    case "back-on-track":
      return impactMonths && impactMonths > 0
        ? `Behind schedule — this brings it back on track, about ${describeMonths(impactMonths)} sooner.`
        : "Behind schedule — this brings it back on track.";

    case "catch-up-partial":
      return impactMonths && impactMonths > 0
        ? `Behind schedule, so it gets a larger share — about ${describeMonths(impactMonths)} sooner.`
        : `Behind schedule, so it gets a larger share. It needs ${money(factors.catchUpCents)} to catch up fully.`;

    case "small-top-up":
      return `Only a little left to go, so this nearly finishes it.`;

    case "deadline-soon":
      return factors.monthsToTarget !== null
        ? `Your nearest deadline — ${describeMonths(factors.monthsToTarget)} away — and currently on track.`
        : "One of your nearer deadlines, and currently on track.";

    case "high-priority": {
      // Say why it got a share of *this* allocation, not just what it is.
      const catchingUp = catchingUpNames(plan, allocation.goalId);
      if (catchingUp.length === 1) {
        return `A high-priority goal, so it still gets a share while ${catchingUp[0]} catches up.`;
      }
      if (catchingUp.length > 1) {
        return "A high-priority goal, so it still gets a share while your behind-schedule goals catch up.";
      }
      return "A high-priority goal, so it takes a larger share of what's available.";
    }

    case "ahead-of-plan":
      return allocation.amountCents > 0
        ? "Already comfortably ahead of schedule, so it takes a smaller share."
        : "Already comfortably ahead of schedule, so the money went elsewhere.";

    case "nothing-left":
      return "The money went to goals that needed it more.";

    case "steady-share":
    default:
      return "A steady share towards this one.";
  }
}

/** The headline: what this plan actually does. */
export function explainPlan(plan: AllocationPlan): string {
  if (plan.availableCents <= 0) {
    return "Enter an amount and we'll suggest a way to spread it.";
  }
  if (plan.totalAllocatedCents === 0) {
    return "There's nowhere to put this right now — every goal is either complete, archived, or has no target set.";
  }

  const parts: string[] = [];
  if (plan.backOnTrackCount > 0) {
    parts.push(
      plan.backOnTrackCount === 1
        ? "brings one goal back on track"
        : `brings ${plan.backOnTrackCount} goals back on track`,
    );
  }
  if (plan.monthsSaved > 0) {
    parts.push(`saves about ${describeMonths(plan.monthsSaved)} across your goals`);
  }

  const head = `Here's one way to spread ${money(plan.totalAllocatedCents)}`;
  if (parts.length === 0) return `${head}.`;
  return `${head} — it ${parts.join(" and ")}.`;
}

/** Said plainly when money has nowhere sensible to go. */
export function explainUnallocated(plan: AllocationPlan): string | null {
  if (plan.unallocatedCents <= 0) return null;
  return plan.totalAllocatedCents === 0
    ? `All ${money(plan.unallocatedCents)} is unallocated.`
    : `${money(plan.unallocatedCents)} is left over — your goals don't need any more than this.`;
}

/** Nothing changes until the customer says so. */
export const ALLOCATION_NOTE_TEXT =
  "Nothing changes until you apply the plan. Applying records these as contributions dated today.";

/* ── Challenges ──────────────────────────────────────────────────────────── */

/**
 * What a challenge has done to its goal so far.
 *
 * Durations are whole months because whole months are the precision the
 * forecast actually has. A challenge that has not yet moved the finish date
 * says so plainly rather than reaching for a smaller-sounding unit to fill
 * the silence — the money saved is a real result on its own.
 */
export function explainChallengeImpact(
  impact: ChallengeImpact,
  goalName: string,
): string {
  if (impact.savedCents <= 0)
    return `Tick your first step and we'll show you what it does to ${goalName}.`;

  const saved = money(impact.savedCents);
  if (impact.after.kind === "complete")
    return `${saved} of ${goalName} came from this challenge, and it's fully funded.`;

  if (impact.monthsSaved === null)
    return `${saved} of ${goalName} has come from this challenge. Set a regular contribution on the goal to see the effect on its finish date.`;

  if (impact.monthsSaved === 0)
    return `${saved} in. That hasn't moved ${goalName}'s finish date by a full month yet — keep going.`;

  return `This challenge has moved ${goalName} ${describeMonths(impact.monthsSaved)} closer.`;
}

/** What finishing the rest of it would do. Null when there is nothing left. */
export function explainChallengeIfFinished(
  impact: ChallengeImpact,
  goalName: string,
): string | null {
  if (impact.remainingCents <= 0) return null;

  const rest = money(impact.remainingCents);
  if (impact.ifFinished.kind === "complete")
    return `The remaining ${rest} would fully fund ${goalName}.`;

  if (impact.ifFinishedExtraMonths === null || impact.ifFinishedExtraMonths === 0)
    return `${rest} to go on this challenge.`;

  return `Finishing the remaining ${rest} would bring ${goalName} forward another ${describeMonths(impact.ifFinishedExtraMonths)}.`;
}

/** "18 of 52 weeks ticked · $171 saved". */
export function explainChallengeProgress(
  progress: ChallengeProgress,
  cadence: ChallengeCadence,
): string {
  const unit = cadence === "weekly" ? "week" : "day";
  const plural = progress.totalSteps === 1 ? unit : `${unit}s`;
  return `${progress.stepsDone} of ${progress.totalSteps} ${plural} ticked · ${money(progress.savedCents)} saved`;
}

/** Why the next step cannot be ticked. Stated as a fact, never as a telling-off. */
export const CHALLENGE_TICK_BLOCK_TEXT: Record<TickBlock, string> = {
  "goal-funded":
    "This goal is fully funded, so the challenge is paused here. Nothing you've saved is lost, and it picks up again if the goal drops back below its target.",
  "goal-archived":
    "This goal is archived, so the challenge is paused. Restore the goal to carry on.",
  "challenge-archived":
    "This challenge is archived. Everything it saved is still on the goal.",
  "goal-missing": "The goal this challenge saved towards no longer exists.",
};

/** Why a goal can't take a new challenge. */
export const CHALLENGE_INELIGIBILITY_TEXT: Record<ChallengeIneligibility, string> = {
  archived: "Archived",
  "no-target": "No target amount set",
  complete: "Already fully funded",
  "has-challenge": "Already has a challenge running",
};

/** Deleting a challenge takes its money with it, so the number is named. */
export const explainChallengeDeletion = (
  savedCents: number,
  goalName: string,
): string =>
  savedCents > 0
    ? `This also removes the ${money(savedCents)} this challenge added to ${goalName}. To keep that money on the goal, archive the challenge instead.`
    : `This challenge hasn't recorded any money, so nothing leaves ${goalName}.`;

/** The combined saving rate, stated the way a person would say it. */
export const explainRate = (summary: PortfolioSummary): string =>
  summary.rate.monthlyCents <= 0
    ? `No regular saving is set up yet.`
    : `You're putting away about ${money(summary.rate.weeklyCents)} a week — ${money(summary.rate.monthlyCents)} a month.`;

export { FREQUENCY_LABEL };
