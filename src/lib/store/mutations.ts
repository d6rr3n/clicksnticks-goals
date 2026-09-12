import type { Contribution, Dataset, Goal } from "../schema";
import { balanceCents, isComplete } from "../calc";

/**
 * Pure dataset transitions. Every mutation returns a new dataset, so the store
 * is a thin wrapper and each transition is testable on its own.
 */

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Keeps completedAt truthful after any change: set when a goal first reaches
 * its target, cleared if a later edit or deletion drops it back below.
 */
export function reconcileCompletion(data: Dataset, now: Date = new Date()): Dataset {
  let changed = false;
  const goals = data.goals.map((goal) => {
    const complete = isComplete(goal, data.contributions);
    if (complete && !goal.completedAt) {
      changed = true;
      return { ...goal, completedAt: now.toISOString() };
    }
    if (!complete && goal.completedAt) {
      changed = true;
      return { ...goal, completedAt: null };
    }
    return goal;
  });

  // A goal that fell back below target should celebrate again if it recrosses.
  const stillComplete = new Set(goals.filter((g) => g.completedAt).map((g) => g.id));
  const celebrated = data.celebrated.filter((id) => stillComplete.has(id));
  if (celebrated.length !== data.celebrated.length) changed = true;

  return changed ? { ...data, goals, celebrated } : data;
}

export function addGoal(data: Dataset, goal: Goal, now = new Date()): Dataset {
  return reconcileCompletion({ ...data, goals: [...data.goals, goal] }, now);
}

export function updateGoal(
  data: Dataset,
  id: string,
  patch: Partial<Goal>,
  now = new Date(),
): Dataset {
  const goals = data.goals.map((g) => (g.id === id ? { ...g, ...patch, id: g.id } : g));
  return reconcileCompletion({ ...data, goals }, now);
}

export const archiveGoal = (data: Dataset, id: string, now = new Date()): Dataset =>
  updateGoal(data, id, { archivedAt: now.toISOString() }, now);

export const restoreGoal = (data: Dataset, id: string, now = new Date()): Dataset =>
  updateGoal(data, id, { archivedAt: null }, now);

/**
 * Deletes the goal and its entire ledger — nothing is left orphaned. Its
 * challenges go with it: their contributions have just been removed, and a
 * challenge pointing at a goal that no longer exists has nothing to move.
 */
export function deleteGoal(data: Dataset, id: string): Dataset {
  return {
    ...data,
    goals: data.goals.filter((g) => g.id !== id),
    contributions: data.contributions.filter((c) => c.goalId !== id),
    challenges: data.challenges.filter((c) => c.goalId !== id),
    celebrated: data.celebrated.filter((c) => c !== id),
  };
}

export function addContribution(
  data: Dataset,
  input: { goalId: string; amountCents: number; date: string; note?: string },
  now = new Date(),
): Dataset {
  const contribution: Contribution = {
    id: newId(),
    goalId: input.goalId,
    amountCents: input.amountCents,
    date: input.date,
    note: input.note,
    createdAt: now.toISOString(),
  };
  return reconcileCompletion(
    { ...data, contributions: [...data.contributions, contribution] },
    now,
  );
}

/**
 * Several contributions in one transition.
 *
 * Smart Allocation is a single user action, so it must land whole: the caller
 * gets one new dataset with every contribution present, or the original
 * dataset untouched. Going through addContribution in a loop would commit —
 * and persist — each one separately, which can leave a half-applied plan if a
 * later write fails.
 */
export function addContributions(
  data: Dataset,
  inputs: Array<{ goalId: string; amountCents: number; date: string; note?: string }>,
  now = new Date(),
): Dataset {
  const usable = inputs.filter((i) => i.amountCents !== 0);
  if (usable.length === 0) return data;

  const created: Contribution[] = usable.map((input) => ({
    id: newId(),
    goalId: input.goalId,
    amountCents: input.amountCents,
    date: input.date,
    note: input.note,
    createdAt: now.toISOString(),
  }));

  return reconcileCompletion(
    { ...data, contributions: [...data.contributions, ...created] },
    now,
  );
}

export function updateContribution(
  data: Dataset,
  id: string,
  patch: Partial<Pick<Contribution, "amountCents" | "date" | "note" | "goalId">>,
  now = new Date(),
): Dataset {
  const contributions = data.contributions.map((c) =>
    c.id === id ? { ...c, ...patch, id: c.id } : c,
  );
  return reconcileCompletion({ ...data, contributions }, now);
}

export function deleteContribution(data: Dataset, id: string, now = new Date()): Dataset {
  return reconcileCompletion(
    { ...data, contributions: data.contributions.filter((c) => c.id !== id) },
    now,
  );
}

export const markCelebrated = (data: Dataset, goalId: string): Dataset =>
  data.celebrated.includes(goalId)
    ? data
    : { ...data, celebrated: [...data.celebrated, goalId] };

/** Goals that just completed and have not been celebrated yet. */
export const pendingCelebrations = (data: Dataset): Goal[] =>
  data.goals.filter(
    (g) =>
      !g.archivedAt &&
      isComplete(g, data.contributions) &&
      !data.celebrated.includes(g.id),
  );

export { balanceCents };
