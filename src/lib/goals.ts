import type { Goal, GoalStatus } from "./types";

/** The day the fixtures are pinned to, so pace maths stays stable. */
export const TODAY = new Date("2026-09-11T00:00:00Z");

export const progressOf = (goal: Goal): number =>
  goal.target <= 0 ? 0 : Math.min(goal.saved / goal.target, 1);

export const remainingOf = (goal: Goal): number =>
  Math.max(goal.target - goal.saved, 0);

/**
 * Where the goal *should* be by now, as a fraction of its timeline.
 * Clamped, so a goal past its target date reads as 100% expected.
 */
export function expectedProgress(goal: Goal, now: Date = TODAY): number {
  const start = new Date(goal.startDate).getTime();
  const end = new Date(goal.targetDate).getTime();
  if (end <= start) return 1;
  return Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
}

/**
 * Status is derived, never stored — a goal is behind when it trails the pace
 * its own timeline implies by more than a tenth of the way.
 */
export function statusOf(goal: Goal, now: Date = TODAY): GoalStatus {
  if (goal.saved >= goal.target) return "complete";
  return progressOf(goal) < expectedProgress(goal, now) - 0.1
    ? "behind"
    : "on-track";
}

export const STATUS_LABEL: Record<GoalStatus, string> = {
  "on-track": "On track",
  behind: "Behind",
  complete: "Complete",
};
