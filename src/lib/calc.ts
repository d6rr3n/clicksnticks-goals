import {
  PER_MONTH,
  type Contribution,
  type Goal,
  type GoalStatus,
} from "./schema";
import { addMonths, isSameMonth, monthsBetween, parseDate, toISODate } from "./dates";

/**
 * Every figure in the app is derived here from goals plus the contribution
 * ledger. Nothing financial is stored twice, so editing or deleting a
 * contribution cannot leave a stale total behind.
 */

export const contributionsFor = (
  contributions: Contribution[],
  goalId: string,
): Contribution[] => contributions.filter((c) => c.goalId === goalId);

/** Opening balance plus every contribution recorded against the goal. */
export function balanceCents(goal: Goal, contributions: Contribution[]): number {
  return contributionsFor(contributions, goal.id).reduce(
    (sum, c) => sum + c.amountCents,
    goal.openingBalanceCents,
  );
}

export const remainingCents = (goal: Goal, contributions: Contribution[]): number =>
  Math.max(goal.targetCents - balanceCents(goal, contributions), 0);

/** 0–1, clamped. A goal overshooting its target still reads as 100%. */
export function percentComplete(goal: Goal, contributions: Contribution[]): number {
  if (goal.targetCents <= 0) return 0;
  const pct = balanceCents(goal, contributions) / goal.targetCents;
  return Math.min(Math.max(pct, 0), 1);
}

export const isComplete = (goal: Goal, contributions: Contribution[]): boolean =>
  goal.targetCents > 0 && balanceCents(goal, contributions) >= goal.targetCents;

export const isArchived = (goal: Goal): boolean => Boolean(goal.archivedAt);

/** Planned contribution converted to a monthly rate. */
export const monthlyRateCents = (goal: Goal): number =>
  Math.round(goal.contributionCents * PER_MONTH[goal.frequency]);

/**
 * Whole months of a given monthly rate needed to clear an outstanding amount.
 * Null when nothing is moving. Partial months round up — you cannot half-pay.
 *
 * This is the single definition of "how long will this take". Projections and
 * every What If scenario go through it, so they cannot drift apart.
 */
export function monthsToClear(
  outstandingCents: number,
  monthlyRate: number,
): number | null {
  if (outstandingCents <= 0) return 0;
  if (monthlyRate <= 0) return null;
  return Math.ceil(outstandingCents / monthlyRate);
}

/** The date a given rate clears a given amount. */
export function completionFromRate(
  outstandingCents: number,
  monthlyRate: number,
  now: Date = new Date(),
): Date | null {
  const months = monthsToClear(outstandingCents, monthlyRate);
  return months === null ? null : addMonths(now, months);
}

/**
 * When the goal finishes at its planned rate.
 * Null when it is not moving — callers say "no completion date at this rate"
 * rather than rendering an infinity.
 */
export function projectedCompletion(
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): Date | null {
  if (isComplete(goal, contributions)) return now;
  return completionFromRate(
    remainingCents(goal, contributions),
    monthlyRateCents(goal),
    now,
  );
}

/**
 * On track when the planned rate lands on or before the target date.
 * Compared as calendar dates: projectedCompletion carries the current time of
 * day, so a timestamp comparison would call a goal landing on its target date
 * "behind" for any completion later in the day than the parsed target.
 */
export function isOnTrack(
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): boolean {
  if (isComplete(goal, contributions)) return true;
  const projected = projectedCompletion(goal, contributions, now);
  if (!projected) return false;
  return toISODate(projected) <= goal.targetDate;
}

export function statusOf(
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): GoalStatus {
  if (isComplete(goal, contributions)) return "complete";
  return isOnTrack(goal, contributions, now) ? "on-track" : "behind";
}

/**
 * How far ahead or behind the goal's own timeline it is, as a fraction.
 * Positive is ahead. Used for the commentary on the detail page.
 */
export function paceGap(
  goal: Goal,
  contributions: Contribution[],
  now: Date = new Date(),
): number {
  const start = parseDate(goal.createdAt.slice(0, 10)).getTime();
  const end = parseDate(goal.targetDate).getTime();
  if (end <= start) return 0;
  const elapsed = Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
  return percentComplete(goal, contributions) - elapsed;
}

/** How many months of the planned rate would clear the remainder. */
export const monthsRemaining = (
  goal: Goal,
  contributions: Contribution[],
): number | null =>
  monthsToClear(remainingCents(goal, contributions), monthlyRateCents(goal));

export interface LedgerRow extends Contribution {
  /** Balance after this contribution, oldest to newest. */
  balanceAfterCents: number;
}

/**
 * Ledger in date order with a running balance. Ties are broken by createdAt so
 * the order — and therefore every running balance — is stable between renders.
 */
export function runningBalances(
  goal: Goal,
  contributions: Contribution[],
): LedgerRow[] {
  const rows = [...contributionsFor(contributions, goal.id)].sort((a, b) => {
    const byDate = parseDate(a.date).getTime() - parseDate(b.date).getTime();
    return byDate !== 0 ? byDate : a.createdAt.localeCompare(b.createdAt);
  });

  let balance = goal.openingBalanceCents;
  return rows.map((c) => {
    balance += c.amountCents;
    return { ...c, balanceAfterCents: balance };
  });
}

/** Newest first, for activity feeds. */
export const byDateDesc = (contributions: Contribution[]): Contribution[] =>
  [...contributions].sort((a, b) => {
    const byDate = parseDate(b.date).getTime() - parseDate(a.date).getTime();
    return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
  });

export interface DashboardTotals {
  totalSavedCents: number;
  totalTargetCents: number;
  totalRemainingCents: number;
  savedThisMonthCents: number;
  activeCount: number;
  completedCount: number;
  onTrackCount: number;
  /** Of active goals, the fraction on track. 0 when there are none. */
  onTrackFraction: number;
  projectedValueCents: number;
}

/**
 * Dashboard figures over the goals that count: archived goals are excluded
 * everywhere, completed goals still count towards totals and stay visible.
 */
export function dashboardTotals(
  goals: Goal[],
  contributions: Contribution[],
  now: Date = new Date(),
): DashboardTotals {
  const live = goals.filter((g) => !isArchived(g));

  const totalSavedCents = live.reduce(
    (sum, g) => sum + balanceCents(g, contributions),
    0,
  );
  const totalTargetCents = live.reduce((sum, g) => sum + g.targetCents, 0);
  const totalRemainingCents = live.reduce(
    (sum, g) => sum + remainingCents(g, contributions),
    0,
  );

  const liveIds = new Set(live.map((g) => g.id));
  const savedThisMonthCents = contributions
    .filter((c) => liveIds.has(c.goalId) && isSameMonth(parseDate(c.date), now))
    .reduce((sum, c) => sum + c.amountCents, 0);

  const completed = live.filter((g) => isComplete(g, contributions));
  const unfinished = live.filter((g) => !isComplete(g, contributions));
  const onTrackCount =
    completed.length +
    unfinished.filter((g) => isOnTrack(g, contributions, now)).length;

  return {
    totalSavedCents,
    totalTargetCents,
    totalRemainingCents,
    savedThisMonthCents,
    activeCount: live.length,
    completedCount: completed.length,
    onTrackCount,
    onTrackFraction: live.length === 0 ? 0 : onTrackCount / live.length,
    projectedValueCents: projectedValue(live, contributions, now),
  };
}

/**
 * Where the plan lands at the end of the forecast horizon, at current planned
 * rates. Shares its maths with the chart, so tile and chart cannot disagree.
 */
export function projectedValue(
  goals: Goal[],
  contributions: Contribution[],
  now: Date = new Date(),
  years = 4,
): number {
  const series = forecastSeries(goals, contributions, now, years);
  return series[series.length - 1]?.valueCents ?? 0;
}

export interface ForecastPoint {
  year: number;
  valueCents: number;
}

export interface ForecastMonth {
  /** Months from now. 0 is today. */
  month: number;
  /** YYYY-MM-DD, the same day-of-month as today where it exists. */
  date: string;
  valueCents: number;
}

export interface ForecastMilestone {
  goalId: string;
  name: string;
  month: number;
  date: string;
  /** Portfolio value at the month this goal completes. */
  valueCents: number;
}

export interface PortfolioForecast {
  months: ForecastMonth[];
  milestones: ForecastMilestone[];
  horizonMonths: number;
  /** True when a goal is still unfinished at the end of the horizon. */
  truncated: boolean;
}

const MIN_HORIZON = 48;
const MAX_HORIZON = 120;

/**
 * How far the chart should run: far enough to show every goal landing, but
 * never beyond ten years, past which a projection is not worth drawing.
 */
export function forecastHorizon(
  goals: Goal[],
  contributions: Contribution[],
): number {
  const needed = goals
    .filter((g) => !isArchived(g))
    .map((g) => monthsRemaining(g, contributions))
    .filter((m): m is number => m !== null);
  const longest = needed.length ? Math.max(...needed) : 0;
  return Math.min(Math.max(longest + 2, MIN_HORIZON), MAX_HORIZON);
}

/**
 * The portfolio walked forward one month at a time — the single forecast
 * engine. Each month every unfinished goal adds its monthly rate, capped at
 * its target. Archived goals are excluded; goals already at or over target
 * contribute their balance and stop.
 *
 * Weekly and fortnightly contributions arrive here already converted at 52 and
 * 26 payments a year (see PER_MONTH), which is the model the whole app uses.
 */
export function portfolioForecast(
  goals: Goal[],
  contributions: Contribution[],
  now: Date = new Date(),
  horizonMonths?: number,
): PortfolioForecast {
  const live = goals.filter((g) => !isArchived(g));
  const horizon = horizonMonths ?? forecastHorizon(goals, contributions);

  const state = live.map((g) => ({
    id: g.id,
    name: g.name,
    balance: balanceCents(g, contributions),
    target: g.targetCents,
    rate: monthlyRateCents(g),
    done: false,
  }));

  const total = () => state.reduce((sum, g) => sum + g.balance, 0);
  const months: ForecastMonth[] = [
    { month: 0, date: toISODate(now), valueCents: total() },
  ];
  const milestones: ForecastMilestone[] = [];

  // A goal that is already at target counts as landed at month zero.
  for (const g of state) {
    if (g.balance >= g.target) {
      g.done = true;
      milestones.push({
        goalId: g.id, name: g.name, month: 0,
        date: toISODate(now), valueCents: months[0].valueCents,
      });
    }
  }

  for (let m = 1; m <= horizon; m++) {
    for (const g of state) {
      if (g.balance >= g.target) continue;
      g.balance = Math.min(g.balance + g.rate, g.target);
    }
    const valueCents = total();
    const date = toISODate(addMonths(now, m));
    months.push({ month: m, date, valueCents });

    for (const g of state) {
      if (!g.done && g.balance >= g.target) {
        g.done = true;
        milestones.push({ goalId: g.id, name: g.name, month: m, date, valueCents });
      }
    }
  }

  return {
    months,
    milestones,
    horizonMonths: horizon,
    truncated: state.some((g) => !g.done),
  };
}

/**
 * The dashboard's yearly series, sampled from the monthly walker above rather
 * than walked separately — so the tile, the dashboard chart and the forecast
 * page can never disagree.
 */
export function forecastSeries(
  goals: Goal[],
  contributions: Contribution[],
  now: Date = new Date(),
  years = 4,
): ForecastPoint[] {
  const { months } = portfolioForecast(goals, contributions, now, years * 12);
  const startYear = now.getFullYear();
  return Array.from({ length: years + 1 }, (_, y) => ({
    year: startYear + y,
    valueCents: months[y * 12].valueCents,
  }));
}

export { monthsBetween, toISODate };
