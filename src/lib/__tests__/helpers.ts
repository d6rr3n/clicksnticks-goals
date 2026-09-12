import type { Contribution, Frequency, Goal } from "../schema";

export const NOW = new Date(2026, 8, 12, 12, 0, 0); // 12 Sep 2026, local noon

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

export function makeGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: nextId("goal"),
    name: "Test Goal",
    category: "house",
    targetCents: 100_00,
    openingBalanceCents: 0,
    targetDate: "2027-09-12",
    contributionCents: 10_00,
    frequency: "monthly",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    completedAt: null,
    ...over,
  };
}

export function makeContribution(
  goalId: string,
  amountCents: number,
  date = "2026-09-01",
  over: Partial<Contribution> = {},
): Contribution {
  return {
    id: nextId("txn"),
    goalId,
    amountCents,
    date,
    createdAt: `${date}T00:00:00.000Z`,
    ...over,
  };
}

export const freq = (f: Frequency) => f;
