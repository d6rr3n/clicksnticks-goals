import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addContribution,
  addGoal,
  archiveGoal,
  deleteContribution,
  deleteGoal,
  markCelebrated,
  pendingCelebrations,
  reconcileCompletion,
  restoreGoal,
  updateContribution,
  updateGoal,
} from "../mutations";
import { balanceCents, dashboardTotals, isComplete } from "../../calc";
import { emptyDataset, type Dataset, type Goal } from "../../schema";
import { buildDemoDataset } from "../../demo";

const NOW = new Date(2026, 8, 12, 12, 0, 0);

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1", name: "House", category: "house", targetCents: 1000_00,
  openingBalanceCents: 0, targetDate: "2030-01-01", contributionCents: 100_00,
  frequency: "monthly", priority: "high", createdAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null, completedAt: null, ...over,
});

const withGoal = (over: Partial<Goal> = {}): Dataset => addGoal(emptyDataset(), goal(over), NOW);

describe("goal mutations", () => {
  test("adding a goal leaves the previous dataset untouched", () => {
    const before = emptyDataset();
    const after = addGoal(before, goal(), NOW);
    assert.equal(before.goals.length, 0);
    assert.equal(after.goals.length, 1);
  });

  test("updating cannot change the id", () => {
    const d = updateGoal(withGoal(), "g1", { id: "hacked", name: "Renamed" } as Partial<Goal>, NOW);
    assert.equal(d.goals[0].id, "g1");
    assert.equal(d.goals[0].name, "Renamed");
  });

  test("archiving is reversible and keeps the goal", () => {
    let d = archiveGoal(withGoal(), "g1", NOW);
    assert.ok(d.goals[0].archivedAt);
    assert.equal(d.goals.length, 1);
    d = restoreGoal(d, "g1", NOW);
    assert.equal(d.goals[0].archivedAt, null);
  });

  test("archived goals drop out of dashboard totals but still exist", () => {
    const d = archiveGoal(withGoal({ openingBalanceCents: 500_00 }), "g1", NOW);
    assert.equal(dashboardTotals(d.goals, d.contributions, NOW).activeCount, 0);
    assert.equal(d.goals.length, 1);
  });

  test("deleting a goal removes its contributions too", () => {
    let d = withGoal();
    d = addContribution(d, { goalId: "g1", amountCents: 50_00, date: "2026-05-01" }, NOW);
    assert.equal(d.contributions.length, 1);
    d = deleteGoal(d, "g1");
    assert.equal(d.goals.length, 0);
    assert.equal(d.contributions.length, 0);
  });
});

describe("contribution mutations", () => {
  test("adding gives a unique transaction id and updates the balance", () => {
    let d = withGoal();
    d = addContribution(d, { goalId: "g1", amountCents: 50_00, date: "2026-05-01" }, NOW);
    d = addContribution(d, { goalId: "g1", amountCents: 25_00, date: "2026-06-01" }, NOW);
    const ids = d.contributions.map((c) => c.id);
    assert.equal(new Set(ids).size, 2);
    assert.equal(balanceCents(d.goals[0], d.contributions), 75_00);
  });

  test("editing an amount recomputes the balance", () => {
    let d = addContribution(withGoal(), { goalId: "g1", amountCents: 50_00, date: "2026-05-01" }, NOW);
    const id = d.contributions[0].id;
    d = updateContribution(d, id, { amountCents: 300_00 }, NOW);
    assert.equal(balanceCents(d.goals[0], d.contributions), 300_00);
  });

  test("deleting reverts the balance", () => {
    let d = addContribution(withGoal(), { goalId: "g1", amountCents: 50_00, date: "2026-05-01" }, NOW);
    d = deleteContribution(d, d.contributions[0].id, NOW);
    assert.equal(balanceCents(d.goals[0], d.contributions), 0);
    assert.equal(d.contributions.length, 0);
  });

  test("a note survives an edit", () => {
    let d = addContribution(
      withGoal(),
      { goalId: "g1", amountCents: 50_00, date: "2026-05-01", note: "Bonus" },
      NOW,
    );
    assert.equal(d.contributions[0].note, "Bonus");
    d = updateContribution(d, d.contributions[0].id, { amountCents: 60_00 }, NOW);
    assert.equal(d.contributions[0].note, "Bonus");
  });
});

describe("completion tracking", () => {
  test("reaching the target stamps completedAt", () => {
    const d = addContribution(withGoal(), { goalId: "g1", amountCents: 1000_00, date: "2026-05-01" }, NOW);
    assert.ok(d.goals[0].completedAt);
    assert.equal(isComplete(d.goals[0], d.contributions), true);
  });

  test("a completed goal is kept, not archived or removed", () => {
    const d = addContribution(withGoal(), { goalId: "g1", amountCents: 1000_00, date: "2026-05-01" }, NOW);
    assert.equal(d.goals.length, 1);
    assert.equal(d.goals[0].archivedAt, null);
  });

  test("deleting a contribution clears completedAt again", () => {
    let d = addContribution(withGoal(), { goalId: "g1", amountCents: 1000_00, date: "2026-05-01" }, NOW);
    assert.ok(d.goals[0].completedAt);
    d = deleteContribution(d, d.contributions[0].id, NOW);
    assert.equal(d.goals[0].completedAt, null);
  });

  test("raising the target un-completes the goal", () => {
    let d = addContribution(withGoal(), { goalId: "g1", amountCents: 1000_00, date: "2026-05-01" }, NOW);
    d = updateGoal(d, "g1", { targetCents: 5000_00 }, NOW);
    assert.equal(d.goals[0].completedAt, null);
  });

  test("celebration fires once, then not again", () => {
    let d = addContribution(withGoal(), { goalId: "g1", amountCents: 1000_00, date: "2026-05-01" }, NOW);
    assert.equal(pendingCelebrations(d).length, 1);
    d = markCelebrated(d, "g1");
    assert.equal(pendingCelebrations(d).length, 0);
  });

  test("a goal that drops below and recrosses celebrates again", () => {
    let d = addContribution(withGoal(), { goalId: "g1", amountCents: 1000_00, date: "2026-05-01" }, NOW);
    d = markCelebrated(d, "g1");
    d = deleteContribution(d, d.contributions[0].id, NOW);
    assert.deepEqual(d.celebrated, []);
    d = addContribution(d, { goalId: "g1", amountCents: 1000_00, date: "2026-06-01" }, NOW);
    assert.equal(pendingCelebrations(d).length, 1);
  });

  test("reconcile is a no-op when nothing changed", () => {
    const d = withGoal();
    assert.equal(reconcileCompletion(d, NOW), d);
  });
});

describe("demo dataset", () => {
  test("balances match the approved dashboard figures", () => {
    const d = buildDemoDataset(NOW);
    const byName = Object.fromEntries(d.goals.map((g) => [g.name, g]));
    assert.equal(balanceCents(byName["House Deposit"], d.contributions), 31_450_00);
    assert.equal(balanceCents(byName["Japan Trip"], d.contributions), 5_420_00);
    assert.equal(balanceCents(byName["New Car"], d.contributions), 8_100_00);
    assert.equal(balanceCents(byName["Emergency Fund"], d.contributions), 10_000_00);
  });

  test("three of four goals are on track, as designed", () => {
    const d = buildDemoDataset(NOW);
    const t = dashboardTotals(d.goals, d.contributions, NOW);
    assert.equal(t.activeCount, 4);
    assert.equal(t.completedCount, 1);
    assert.equal(t.onTrackCount, 3);
  });

  test("each build is an independent copy", () => {
    const a = buildDemoDataset(NOW);
    const b = buildDemoDataset(NOW);
    a.goals[0].name = "Mutated";
    assert.notEqual(b.goals[0].name, "Mutated");
  });

  test("every contribution belongs to a goal that exists", () => {
    const d = buildDemoDataset(NOW);
    const ids = new Set(d.goals.map((g) => g.id));
    assert.ok(d.contributions.every((c) => ids.has(c.goalId)));
  });
});
