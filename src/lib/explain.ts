import { money } from "./money";
import { monthYear } from "./dates";
import { FREQUENCY_LABEL, type Frequency, type Goal } from "./schema";
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

/** The combined saving rate, stated the way a person would say it. */
export const explainRate = (summary: PortfolioSummary): string =>
  summary.rate.monthlyCents <= 0
    ? `No regular saving is set up yet.`
    : `You're putting away about ${money(summary.rate.weeklyCents)} a week — ${money(summary.rate.monthlyCents)} a month.`;

export { FREQUENCY_LABEL };
