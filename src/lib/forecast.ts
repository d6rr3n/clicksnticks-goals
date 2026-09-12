import {
  balanceCents,
  completionFromRate,
  forecastHorizon,
  isArchived,
  isComplete,
  isOnTrack,
  monthlyRateCents,
  monthsToClear,
  percentComplete,
  portfolioForecast,
  remainingCents,
} from "./calc";
import { addMonths, parseDate, toISODate } from "./dates";
import { PER_MONTH, type Contribution, type Frequency, type Goal } from "./schema";

/**
 * Forecast scenarios. Everything here is exploratory: nothing in this file
 * writes, and no scenario alters a goal. Applying a scenario is a separate,
 * explicit action in the UI.
 *
 * All arithmetic routes through calc.ts, so a scenario can never disagree with
 * the projection shown elsewhere.
 */

/* ── Projections ─────────────────────────────────────────────────────────── */

/**
 * The five states a goal can be in, kept distinct so the UI never blurs
 * "finished" with "cannot be projected".
 */
export type Projection =
  | { kind: "complete" }
  | { kind: "unable" }
  | { kind: "projected"; months: number; date: string; onTrack: boolean };

export function projectionFor(
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): Projection {
  if (isComplete(goal, contributions)) return { kind: "complete" };
  const months = monthsToClear(
    remainingCents(goal, contributions),
    monthlyRateCents(goal),
  );
  if (months === null) return { kind: "unable" };
  return {
    kind: "projected",
    months,
    date: toISODate(addMonths(now, months)),
    onTrack: isOnTrack(goal, contributions, now),
  };
}

/** Months between the projection and the goal's own target date. */
export function monthsAgainstTarget(
  goal: Goal,
  projection: Projection,
): number | null {
  if (projection.kind !== "projected") return null;
  const target = parseDate(goal.targetDate);
  const projected = parseDate(projection.date);
  const months =
    (target.getFullYear() - projected.getFullYear()) * 12 +
    (target.getMonth() - projected.getMonth());
  return months;
}

/* ── Frequency conversion ────────────────────────────────────────────────── */

/** A monthly rate expressed per period, rounded up so the target is met. */
export const perPeriodFromMonthly = (
  monthlyCents: number,
  frequency: Frequency,
): number => Math.ceil(monthlyCents / PER_MONTH[frequency]);

/** A per-period amount expressed as a monthly rate. */
export const monthlyFromPerPeriod = (
  perPeriodCents: number,
  frequency: Frequency,
): number => Math.round(perPeriodCents * PER_MONTH[frequency]);

export interface RateInFrequencies {
  weeklyCents: number;
  fortnightlyCents: number;
  monthlyCents: number;
}

export const rateInAllFrequencies = (monthlyCents: number): RateInFrequencies => ({
  weeklyCents: perPeriodFromMonthly(monthlyCents, "weekly"),
  fortnightlyCents: perPeriodFromMonthly(monthlyCents, "fortnightly"),
  monthlyCents: monthlyCents,
});

/* ── Scenario A: save more regularly ─────────────────────────────────────── */

export interface ExtraScenario {
  baseline: Projection;
  scenario: Projection;
  /** Whole months brought forward. Null when either side cannot be projected. */
  monthsSaved: number | null;
  /** The goal's monthly rate before and after. */
  baselineMonthlyCents: number;
  scenarioMonthlyCents: number;
  /**
   * The new per-period figure, only when the extra is added at the goal's own
   * frequency — otherwise combining two schedules into one number would lie.
   */
  newPerPeriodCents: number | null;
}

export function simulateExtra(
  goal: Goal,
  contributions: Contribution[],
  extra: { amountCents: number; frequency: Frequency },
  now: Date = new Date(),
): ExtraScenario {
  const baseline = projectionFor(goal, contributions, now);
  const baselineMonthly = monthlyRateCents(goal);
  const scenarioMonthly =
    baselineMonthly + monthlyFromPerPeriod(Math.max(extra.amountCents, 0), extra.frequency);

  const outstanding = remainingCents(goal, contributions);
  const months = monthsToClear(outstanding, scenarioMonthly);

  const scenario: Projection = isComplete(goal, contributions)
    ? { kind: "complete" }
    : months === null
      ? { kind: "unable" }
      : {
          kind: "projected",
          months,
          date: toISODate(addMonths(now, months)),
          onTrack: toISODate(addMonths(now, months)) <= goal.targetDate,
        };

  const monthsSaved =
    baseline.kind === "projected" && scenario.kind === "projected"
      ? Math.max(baseline.months - scenario.months, 0)
      : null;

  return {
    baseline,
    scenario,
    monthsSaved,
    baselineMonthlyCents: baselineMonthly,
    scenarioMonthlyCents: scenarioMonthly,
    newPerPeriodCents:
      extra.frequency === goal.frequency
        ? goal.contributionCents + Math.max(extra.amountCents, 0)
        : null,
  };
}

/* ── Scenario B: add money today ─────────────────────────────────────────── */

export interface LumpSumScenario {
  baseline: Projection;
  scenario: Projection;
  monthsSaved: number | null;
  newBalanceCents: number;
  newPercentComplete: number;
  /** True when the lump sum alone finishes the goal. */
  completesGoal: boolean;
}

export function simulateLumpSum(
  goal: Goal,
  contributions: Contribution[],
  amountCents: number,
  now: Date = new Date(),
): LumpSumScenario {
  const baseline = projectionFor(goal, contributions, now);
  const amount = Math.max(amountCents, 0);
  const newBalance = balanceCents(goal, contributions) + amount;
  const outstanding = Math.max(goal.targetCents - newBalance, 0);
  const completesGoal = outstanding <= 0 && goal.targetCents > 0;

  const months = monthsToClear(outstanding, monthlyRateCents(goal));
  const scenario: Projection = completesGoal
    ? { kind: "complete" }
    : months === null
      ? { kind: "unable" }
      : {
          kind: "projected",
          months,
          date: toISODate(addMonths(now, months)),
          onTrack: toISODate(addMonths(now, months)) <= goal.targetDate,
        };

  const monthsSaved =
    baseline.kind === "projected"
      ? scenario.kind === "projected"
        ? Math.max(baseline.months - scenario.months, 0)
        : scenario.kind === "complete"
          ? baseline.months
          : null
      : null;

  return {
    baseline,
    scenario,
    monthsSaved,
    newBalanceCents: newBalance,
    newPercentComplete:
      goal.targetCents <= 0 ? 0 : Math.min(newBalance / goal.targetCents, 1),
    completesGoal,
  };
}

/* ── Scenario C: reach it by… ────────────────────────────────────────────── */

export type RequiredRate =
  | { kind: "already-complete" }
  | { kind: "unreachable"; reason: "date-passed" | "no-time" }
  | {
      kind: "required";
      months: number;
      required: RateInFrequencies;
      current: RateInFrequencies;
      /** Positive means they need to find more. Per period, by frequency. */
      deltaWeeklyCents: number;
      deltaFortnightlyCents: number;
      deltaMonthlyCents: number;
      /** True when their current plan already gets there in time. */
      alreadyEnough: boolean;
    };

/**
 * Works backwards from a chosen date.
 *
 * The number of payments is the count of whole months that fit before the
 * date, matching how projectedCompletion counts forward — so solving for a
 * date and then projecting that rate agree with each other.
 *
 * Every figure rounds up. Rounding down would leave the target short by a few
 * cents, which is worse than asking for a dollar more.
 */
export function requiredRate(
  goal: Goal,
  contributions: Contribution[],
  byDateISO: string,
  now: Date = new Date(),
): RequiredRate {
  if (isComplete(goal, contributions)) return { kind: "already-complete" };

  const target = parseDate(byDateISO).getTime();
  if (target < parseDate(toISODate(now)).getTime()) {
    return { kind: "unreachable", reason: "date-passed" };
  }

  let months = 0;
  while (months < 1200 && parseDate(toISODate(addMonths(now, months + 1))).getTime() <= target) {
    months++;
  }
  if (months === 0) return { kind: "unreachable", reason: "no-time" };

  const outstanding = remainingCents(goal, contributions);
  const requiredMonthly = Math.ceil(outstanding / months);
  const currentMonthly = monthlyRateCents(goal);

  const required = rateInAllFrequencies(requiredMonthly);
  const current = rateInAllFrequencies(currentMonthly);

  return {
    kind: "required",
    months,
    required,
    current,
    deltaWeeklyCents: required.weeklyCents - current.weeklyCents,
    deltaFortnightlyCents: required.fortnightlyCents - current.fortnightlyCents,
    deltaMonthlyCents: required.monthlyCents - current.monthlyCents,
    alreadyEnough: currentMonthly >= requiredMonthly,
  };
}

/* ── Portfolio summary ───────────────────────────────────────────────────── */

export interface GoalLanding {
  goalId: string;
  name: string;
  emoji?: string;
  date: string;
  months: number;
}

export interface PortfolioSummary {
  totalSavedCents: number;
  totalRemainingCents: number;
  /** Combined regular saving across unfinished goals. */
  rate: RateInFrequencies;
  projectedValueCents: number;
  horizonMonths: number;
  nextToComplete: GoalLanding | null;
  latestToComplete: GoalLanding | null;
  activeCount: number;
  completedCount: number;
  onTrackCount: number;
  /** Goals with no contribution set, which cannot be projected at all. */
  unprojectableCount: number;
  truncated: boolean;
}

export function portfolioSummary(
  goals: Goal[],
  contributions: Contribution[],
  now: Date = new Date(),
): PortfolioSummary {
  const live = goals.filter((g) => !isArchived(g));
  const unfinished = live.filter((g) => !isComplete(g, contributions));

  const forecast = portfolioForecast(goals, contributions, now);
  const last = forecast.months[forecast.months.length - 1];

  const landings: GoalLanding[] = [];
  for (const g of unfinished) {
    const p = projectionFor(g, contributions, now);
    if (p.kind === "projected") {
      landings.push({
        goalId: g.id, name: g.name, emoji: g.emoji, date: p.date, months: p.months,
      });
    }
  }
  landings.sort((a, b) => a.months - b.months);

  return {
    totalSavedCents: live.reduce((s, g) => s + balanceCents(g, contributions), 0),
    totalRemainingCents: live.reduce((s, g) => s + remainingCents(g, contributions), 0),
    rate: rateInAllFrequencies(
      unfinished.reduce((s, g) => s + monthlyRateCents(g), 0),
    ),
    projectedValueCents: last?.valueCents ?? 0,
    horizonMonths: forecast.horizonMonths,
    nextToComplete: landings[0] ?? null,
    latestToComplete: landings.length ? landings[landings.length - 1] : null,
    activeCount: live.length,
    completedCount: live.filter((g) => isComplete(g, contributions)).length,
    onTrackCount:
      live.filter((g) => isComplete(g, contributions)).length +
      unfinished.filter((g) => isOnTrack(g, contributions, now)).length,
    unprojectableCount: unfinished.filter((g) => monthlyRateCents(g) <= 0).length,
    truncated: forecast.truncated,
  };
}

/** The portfolio value the forecast reaches on or before a given month. */
export function valueAtMonth(
  forecast: ReturnType<typeof portfolioForecast>,
  month: number,
): number {
  const clamped = Math.min(Math.max(month, 0), forecast.months.length - 1);
  return forecast.months[clamped].valueCents;
}

export { completionFromRate, percentComplete, portfolioForecast, forecastHorizon };
