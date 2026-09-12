import {
  cadenceOf,
  challengeIneligibility,
  generateSteps,
  restoreBlock,
  stepNote,
  type ChallengeSpec,
} from "../challenges";
import { isArchived, remainingCents } from "../calc";
import { toISODate } from "../dates";
import { newId, reconcileCompletion } from "./mutations";
import type { Challenge, Contribution, Dataset } from "../schema";

/**
 * Pure challenge transitions, in the same shape as the goal mutations: every
 * one takes a dataset and returns a new one, or returns the original
 * unchanged when it has nothing to do. The store's `commit` skips the write
 * when a transition returns the same object, so "already done" costs nothing.
 *
 * These live beside the goal mutations rather than inside them so that the
 * approved contribution transitions stay exactly as they were reviewed.
 */

const linksTo = (contribution: Contribution, challengeId: string): boolean =>
  contribution.source?.challengeId === challengeId;

const linksToStep = (
  contribution: Contribution,
  challengeId: string,
  step: number,
): boolean =>
  contribution.source?.challengeId === challengeId &&
  contribution.source.step === step;

export interface NewChallengeInput {
  /** Supplied by the caller so it can navigate to the challenge it created. */
  id: string;
  goalId: string;
  name: string;
  spec: ChallengeSpec;
  /** YYYY-MM-DD. */
  startDate: string;
}

/**
 * Creates a challenge against an eligible goal. The eligibility check is
 * repeated here rather than trusted from the form: a completed, archived,
 * targetless or already-challenged goal cannot pick one up by any route.
 */
export function addChallenge(
  data: Dataset,
  input: NewChallengeInput,
  now: Date = new Date(),
): Dataset {
  const goal = data.goals.find((g) => g.id === input.goalId);
  if (!goal) return data;
  if (challengeIneligibility(goal, data.contributions, data.challenges) !== null)
    return data;

  const stepCents = generateSteps(input.spec);
  if (stepCents.length === 0) return data;

  const challenge: Challenge = {
    id: input.id,
    goalId: input.goalId,
    type: input.spec.type,
    name: input.name,
    stepCents,
    cadence: cadenceOf(input.spec.type),
    startDate: input.startDate,
    createdAt: now.toISOString(),
    archivedAt: null,
  };

  return { ...data, challenges: [...data.challenges, challenge] };
}

/**
 * Renaming and re-dating are always safe. The schedule is not: once any step
 * has been ticked, money has been recorded against these amounts, and editing
 * them underneath would rewrite what the customer was told they saved. So a
 * schedule change is refused outright rather than partially applied.
 */
export function updateChallenge(
  data: Dataset,
  id: string,
  patch: { name?: string; startDate?: string; spec?: ChallengeSpec },
): Dataset {
  const challenge = data.challenges.find((c) => c.id === id);
  if (!challenge) return data;

  let { stepCents, type, cadence } = challenge;
  if (patch.spec) {
    if (data.contributions.some((c) => linksTo(c, id))) return data;
    const next = generateSteps(patch.spec);
    if (next.length === 0) return data;
    stepCents = next;
    type = patch.spec.type;
    cadence = cadenceOf(patch.spec.type);
  }

  const updated: Challenge = {
    ...challenge,
    name: patch.name ?? challenge.name,
    startDate: patch.startDate ?? challenge.startDate,
    stepCents,
    type,
    cadence,
  };

  return {
    ...data,
    challenges: data.challenges.map((c) => (c.id === id ? updated : c)),
  };
}

const setArchived = (data: Dataset, id: string, at: string | null): Dataset => {
  const challenge = data.challenges.find((c) => c.id === id);
  if (!challenge || (challenge.archivedAt ?? null) === at) return data;
  return {
    ...data,
    challenges: data.challenges.map((c) =>
      c.id === id ? { ...c, archivedAt: at } : c,
    ),
  };
};

/** The ordinary way out: the challenge is put away, every cent of it stays. */
export const archiveChallenge = (
  data: Dataset,
  id: string,
  now: Date = new Date(),
): Dataset => setArchived(data, id, now.toISOString());

/**
 * Restoring is refused when the goal has picked up another challenge in the
 * meantime, because V1 runs one per goal. The newer challenge is never
 * archived or deleted to make room — that would be this code quietly
 * undoing a decision the customer made.
 */
export function restoreChallenge(data: Dataset, id: string): Dataset {
  const challenge = data.challenges.find((c) => c.id === id);
  if (!challenge) return data;
  if (restoreBlock(challenge, data.goals, data.challenges) !== null) return data;
  return setArchived(data, id, null);
}

/**
 * The destructive way out: the challenge and the contributions it recorded
 * both go. Callers must confirm this explicitly and name the amount — keeping
 * the money is what archiving is for.
 */
export function deleteChallenge(
  data: Dataset,
  id: string,
  now: Date = new Date(),
): Dataset {
  if (!data.challenges.some((c) => c.id === id)) return data;
  return reconcileCompletion(
    {
      ...data,
      challenges: data.challenges.filter((c) => c.id !== id),
      contributions: data.contributions.filter((c) => !linksTo(c, id)),
    },
    now,
  );
}

/**
 * Ticks one step, recording exactly one contribution.
 *
 * The uniqueness check runs against the dataset being written, immediately
 * before writing it, so repeated clicks, re-renders and reloads all collapse
 * onto the one row: the second attempt finds the first and returns the
 * dataset untouched. Two browser tabs writing the same step at the same
 * instant is beyond what localStorage can arbitrate, and is not claimed.
 *
 * The contribution is dated today, because today is when the customer told us
 * the money went in. The step's own due date stays derivable from the
 * challenge, and is shown separately — backdating the ledger to it would make
 * the financial history look more precise than it is.
 */
export function completeStep(
  data: Dataset,
  challengeId: string,
  step: number,
  now: Date = new Date(),
): Dataset {
  const challenge = data.challenges.find((c) => c.id === challengeId);
  if (!challenge || challenge.archivedAt) return data;
  if (!Number.isInteger(step) || step < 0 || step >= challenge.stepCents.length)
    return data;
  if (data.contributions.some((c) => linksToStep(c, challengeId, step))) return data;

  const goal = data.goals.find((g) => g.id === challenge.goalId);
  if (!goal || isArchived(goal)) return data;

  // A funded goal has nowhere closer to go, so the challenge pauses here.
  const remaining = remainingCents(goal, data.contributions);
  if (remaining <= 0) return data;

  /*
   * A step never pushes the goal past its target. If the goal needs $5 and
   * the next step asks for $10, $5 is what gets recorded: the goal lands
   * exactly on target and the challenge pauses from there. The step still
   * counts as ticked, and the grid marks it as differing from the plan.
   */
  const contribution: Contribution = {
    id: newId(),
    goalId: goal.id,
    amountCents: Math.min(challenge.stepCents[step], remaining),
    date: toISODate(now),
    note: stepNote(challenge, step),
    source: { challengeId, step },
    createdAt: now.toISOString(),
  };

  return reconcileCompletion(
    { ...data, contributions: [...data.contributions, contribution] },
    now,
  );
}

/**
 * Unticks one step, removing only what that step recorded.
 *
 * Rows are matched on the challenge/step link alone — never on amount, date or
 * note, which an unrelated contribution may legitimately share. Unticking
 * stays available even when ticking is blocked, so a step added against a goal
 * that has since been funded or archived can still be taken back.
 */
export function uncompleteStep(
  data: Dataset,
  challengeId: string,
  step: number,
  now: Date = new Date(),
): Dataset {
  const contributions = data.contributions.filter(
    (c) => !linksToStep(c, challengeId, step),
  );
  if (contributions.length === data.contributions.length) return data;
  return reconcileCompletion({ ...data, contributions }, now);
}
