import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addChallenge,
  archiveChallenge,
  completeStep,
  deleteChallenge,
  restoreChallenge,
  uncompleteStep,
  updateChallenge,
} from "../challenges";
import { addContribution, addGoal, archiveGoal, deleteGoal, updateContribution } from "../mutations";
import { readDataset, writeDataset, type StorageLike } from "../storage";
import { balanceCents, isComplete, runningBalances } from "../../calc";
import { challengeProgress, generateSteps, stepDueDate } from "../../challenges";
import { emptyDataset, type Dataset, type Goal } from "../../schema";

const NOW = new Date(2026, 8, 12, 12, 0, 0); // 12 Sep 2026, local noon
const TODAY = "2026-09-12";

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1", name: "Japan Trip", category: "travel", targetCents: 5000_00,
  openingBalanceCents: 0, targetDate: "2028-09-12", contributionCents: 100_00,
  frequency: "monthly", priority: "high", createdAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null, completedAt: null, ...over,
});

/** A dataset with one goal and one 52-week challenge against it. */
function withChallenge(over: Partial<Goal> = {}): Dataset {
  const data = addGoal(emptyDataset(), goal(over), NOW);
  return addChallenge(
    data,
    { id: "c1", goalId: "g1", name: "52 Week Challenge", spec: { type: "52-week" }, startDate: TODAY },
    NOW,
  );
}

const challengeRows = (data: Dataset, id = "c1") =>
  data.contributions.filter((c) => c.source?.challengeId === id);

/* ── Creating ────────────────────────────────────────────────────────────── */

describe("creating a challenge", () => {
  test("stores the generated schedule and nothing about money", () => {
    const data = withChallenge();
    assert.equal(data.challenges.length, 1);
    const c = data.challenges[0];
    assert.equal(c.goalId, "g1");
    assert.equal(c.cadence, "weekly");
    assert.equal(c.stepCents.length, 52);
    assert.deepEqual(c.stepCents, generateSteps({ type: "52-week" }));
    assert.equal(data.contributions.length, 0);
    assert.equal(balanceCents(data.goals[0], data.contributions), 0);
  });

  test("a fully funded goal cannot be given one", () => {
    const data = addGoal(
      emptyDataset(),
      goal({ targetCents: 100_00, openingBalanceCents: 100_00 }),
      NOW,
    );
    const after = addChallenge(
      data,
      { id: "c1", goalId: "g1", name: "52", spec: { type: "52-week" }, startDate: TODAY },
      NOW,
    );
    assert.equal(after, data, "the dataset is returned untouched");
    assert.equal(after.challenges.length, 0);
  });

  test("an archived goal cannot be given one", () => {
    const data = archiveGoal(addGoal(emptyDataset(), goal(), NOW), "g1", NOW);
    const after = addChallenge(
      data,
      { id: "c1", goalId: "g1", name: "52", spec: { type: "52-week" }, startDate: TODAY },
      NOW,
    );
    assert.equal(after.challenges.length, 0);
  });

  test("a goal already running one cannot take a second", () => {
    const data = withChallenge();
    const after = addChallenge(
      data,
      { id: "c2", goalId: "g1", name: "Another", spec: { type: "reverse-52" }, startDate: TODAY },
      NOW,
    );
    assert.equal(after.challenges.length, 1);
  });

  test("a goal that no longer exists cannot be given one", () => {
    const after = addChallenge(
      emptyDataset(),
      { id: "c1", goalId: "nope", name: "52", spec: { type: "52-week" }, startDate: TODAY },
      NOW,
    );
    assert.equal(after.challenges.length, 0);
  });
});

/* ── Ticking exactly once ────────────────────────────────────────────────── */

describe("ticking a step", () => {
  test("records exactly one contribution, linked to the step", () => {
    const data = completeStep(withChallenge(), "c1", 0, NOW);
    assert.equal(data.contributions.length, 1);
    const [row] = data.contributions;
    assert.equal(row.goalId, "g1");
    assert.equal(row.amountCents, 1_00);
    assert.deepEqual(row.source, { challengeId: "c1", step: 0 });
    assert.equal(balanceCents(data.goals[0], data.contributions), 1_00);
  });

  test("the contribution is dated today, not the step's due date", () => {
    // Step 40 falls due well into 2027; the money went in today.
    const base = withChallenge();
    const data = completeStep(base, "c1", 40, NOW);
    assert.equal(data.contributions[0].date, TODAY);
    assert.notEqual(stepDueDate(base.challenges[0], 40), TODAY);
  });

  test("ticking the same step again changes nothing at all", () => {
    const once = completeStep(withChallenge(), "c1", 3, NOW);
    const twice = completeStep(once, "c1", 3, NOW);
    const thrice = completeStep(twice, "c1", 3, new Date(2026, 8, 13, 12));
    assert.equal(twice, once, "the same dataset object is returned");
    assert.equal(thrice, once);
    assert.equal(twice.contributions.length, 1);
    assert.equal(balanceCents(twice.goals[0], twice.contributions), 4_00);
  });

  test("a reload cannot duplicate a step", () => {
    const store = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
      removeItem: (k) => void store.delete(k),
    };

    let data = completeStep(withChallenge(), "c1", 7, NOW);
    writeDataset(storage, "real", data);

    // Come back to it and tick the same step again.
    data = readDataset(storage, "real").data;
    assert.equal(data.contributions.length, 1);
    const after = completeStep(data, "c1", 7, NOW);
    assert.equal(after.contributions.length, 1);
    assert.equal(after, data);
  });

  test("each step is its own contribution", () => {
    let data = withChallenge();
    for (const step of [0, 1, 2]) data = completeStep(data, "c1", step, NOW);
    assert.equal(data.contributions.length, 3);
    assert.equal(balanceCents(data.goals[0], data.contributions), 1_00 + 2_00 + 3_00);
  });

  test("a step outside the schedule is refused", () => {
    const data = withChallenge();
    assert.equal(completeStep(data, "c1", 52, NOW), data);
    assert.equal(completeStep(data, "c1", -1, NOW), data);
    assert.equal(completeStep(data, "c1", 1.5, NOW), data);
  });

  test("an unknown challenge is refused", () => {
    const data = withChallenge();
    assert.equal(completeStep(data, "nope", 0, NOW), data);
  });

  test("an archived challenge cannot be ticked", () => {
    const data = archiveChallenge(withChallenge(), "c1", NOW);
    assert.equal(completeStep(data, "c1", 0, NOW), data);
  });

  test("a funded goal pauses ticking", () => {
    // $100 target, one $52 step gets it to $52; top it up to full by hand.
    let data = withChallenge({ targetCents: 52_00 });
    data = completeStep(data, "c1", 51, NOW); // $52 — funds it outright
    assert.ok(isComplete(data.goals[0], data.contributions));

    const after = completeStep(data, "c1", 50, NOW);
    assert.equal(after, data, "no further step is recorded");
    assert.equal(challengeRows(after).length, 1);
  });

  test("an archived goal pauses ticking", () => {
    const data = archiveGoal(withChallenge(), "g1", NOW);
    assert.equal(completeStep(data, "c1", 0, NOW), data);
  });

  test("a goal funded elsewhere pauses the challenge, then it resumes", () => {
    let data = withChallenge({ targetCents: 200_00 });
    data = completeStep(data, "c1", 0, NOW); // $1
    data = addContribution(
      data,
      { goalId: "g1", amountCents: 199_00, date: TODAY, note: "Bonus" },
      NOW,
    );
    assert.ok(isComplete(data.goals[0], data.contributions));
    assert.equal(completeStep(data, "c1", 1, NOW), data, "paused while funded");

    // The bonus is removed, so the goal drops back below target.
    const bonus = data.contributions.find((c) => c.note === "Bonus");
    data = updateContribution(data, bonus!.id, { amountCents: 1_00 }, NOW);
    assert.ok(!isComplete(data.goals[0], data.contributions));
    const resumed = completeStep(data, "c1", 1, NOW);
    assert.equal(challengeRows(resumed).length, 2, "ticking resumes");
  });
});

/* ── Unticking exactly once ──────────────────────────────────────────────── */

describe("unticking a step", () => {
  test("removes only the contribution that step recorded", () => {
    let data = withChallenge();
    data = completeStep(data, "c1", 0, NOW);
    data = completeStep(data, "c1", 1, NOW);
    data = uncompleteStep(data, "c1", 0, NOW);

    assert.equal(challengeRows(data).length, 1);
    assert.equal(data.contributions[0].source?.step, 1);
    assert.equal(balanceCents(data.goals[0], data.contributions), 2_00);
  });

  test("never touches an unrelated row that shares the amount, date and note", () => {
    let data = withChallenge();
    data = completeStep(data, "c1", 0, NOW); // $1, dated today
    const challengeRow = data.contributions[0];
    // A hand-entered row that looks identical in every visible way.
    data = addContribution(
      data,
      { goalId: "g1", amountCents: 1_00, date: TODAY, note: challengeRow.note },
      NOW,
    );
    assert.equal(data.contributions.length, 2);

    data = uncompleteStep(data, "c1", 0, NOW);
    assert.equal(data.contributions.length, 1);
    assert.equal(data.contributions[0].source, undefined, "the hand-entered row survives");
    assert.equal(balanceCents(data.goals[0], data.contributions), 1_00);
  });

  test("unticking a step that was never ticked changes nothing", () => {
    const data = completeStep(withChallenge(), "c1", 0, NOW);
    assert.equal(uncompleteStep(data, "c1", 9, NOW), data);
    assert.equal(uncompleteStep(data, "other", 0, NOW), data);
  });

  test("tick, untick, tick again lands on one contribution", () => {
    let data = withChallenge();
    data = completeStep(data, "c1", 5, NOW);
    data = uncompleteStep(data, "c1", 5, NOW);
    assert.equal(data.contributions.length, 0);
    data = completeStep(data, "c1", 5, NOW);
    assert.equal(data.contributions.length, 1);
    assert.equal(balanceCents(data.goals[0], data.contributions), 6_00);
  });

  test("a step ticked against a since-funded goal can still be taken back", () => {
    let data = withChallenge({ targetCents: 52_00 });
    data = completeStep(data, "c1", 51, NOW);
    assert.ok(isComplete(data.goals[0], data.contributions));

    data = uncompleteStep(data, "c1", 51, NOW);
    assert.equal(challengeRows(data).length, 0);
    assert.ok(!isComplete(data.goals[0], data.contributions));
    assert.equal(data.goals[0].completedAt, null, "completion is reconciled");
  });
});

/* ── The ledger is the only record ───────────────────────────────────────── */

describe("challenge money is ordinary ledger money", () => {
  test("it shows in the goal's history with a running balance", () => {
    let data = withChallenge();
    data = completeStep(data, "c1", 0, NOW);
    data = completeStep(data, "c1", 1, NOW);

    const rows = runningBalances(data.goals[0], data.contributions);
    assert.equal(rows.length, 2);
    assert.equal(rows[1].balanceAfterCents, 3_00);
    assert.ok(rows[0].note?.includes("week 1"));
  });

  test("correcting the row on the goal page is respected, not overwritten", () => {
    let data = completeStep(withChallenge(), "c1", 0, NOW);
    const row = data.contributions[0];
    data = updateContribution(data, row.id, { amountCents: 20_00 }, NOW);

    const progress = challengeProgress(data.challenges[0], data.contributions);
    assert.equal(progress.savedCents, 20_00, "what was actually saved");
    assert.equal(progress.stepsDone, 1, "the step is still ticked");
    assert.deepEqual(progress.adjustedSteps, [0]);
    assert.equal(balanceCents(data.goals[0], data.contributions), 20_00);
  });

  test("deleting the row on the goal page simply unticks the step", () => {
    let data = completeStep(withChallenge(), "c1", 0, NOW);
    const row = data.contributions[0];
    data = { ...data, contributions: data.contributions.filter((c) => c.id !== row.id) };

    const progress = challengeProgress(data.challenges[0], data.contributions);
    assert.equal(progress.stepsDone, 0);
    assert.equal(progress.savedCents, 0);
  });

  test("a step that funds the goal marks it complete", () => {
    const data = completeStep(withChallenge({ targetCents: 1_00 }), "c1", 0, NOW);
    assert.ok(isComplete(data.goals[0], data.contributions));
    assert.ok(data.goals[0].completedAt);
  });
});

/* ── Editing ─────────────────────────────────────────────────────────────── */

describe("editing a challenge", () => {
  test("renaming and re-dating are always allowed", () => {
    let data = completeStep(withChallenge(), "c1", 0, NOW);
    data = updateChallenge(data, "c1", { name: "Our 52", startDate: "2026-10-01" });
    assert.equal(data.challenges[0].name, "Our 52");
    assert.equal(data.challenges[0].startDate, "2026-10-01");
  });

  test("the schedule can be changed while nothing is ticked", () => {
    const data = updateChallenge(withChallenge(), "c1", {
      spec: { type: "custom-weekly", targetCents: 500_00, weeks: 10 },
    });
    assert.equal(data.challenges[0].type, "custom-weekly");
    assert.equal(data.challenges[0].stepCents.length, 10);
    assert.equal(
      data.challenges[0].stepCents.reduce((a, b) => a + b, 0),
      500_00,
    );
  });

  test("the schedule is frozen once a step has been ticked", () => {
    const data = completeStep(withChallenge(), "c1", 0, NOW);
    const after = updateChallenge(data, "c1", {
      spec: { type: "custom-weekly", targetCents: 10_00, weeks: 2 },
    });
    assert.equal(after, data, "refused outright rather than half-applied");
    assert.equal(after.challenges[0].stepCents.length, 52);
  });

  test("a name change alongside a refused schedule change is refused too", () => {
    const data = completeStep(withChallenge(), "c1", 0, NOW);
    const after = updateChallenge(data, "c1", {
      name: "Renamed",
      spec: { type: "reverse-52" },
    });
    assert.equal(after.challenges[0].name, "52 Week Challenge");
  });

  test("an unknown challenge is refused", () => {
    const data = withChallenge();
    assert.equal(updateChallenge(data, "nope", { name: "x" }), data);
  });
});

/* ── Archiving and deleting ──────────────────────────────────────────────── */

describe("archiving and deleting", () => {
  test("archiving keeps every cent on the goal", () => {
    let data = completeStep(withChallenge(), "c1", 5, NOW);
    const before = balanceCents(data.goals[0], data.contributions);
    data = archiveChallenge(data, "c1", NOW);

    assert.ok(data.challenges[0].archivedAt);
    assert.equal(data.contributions.length, 1);
    assert.equal(balanceCents(data.goals[0], data.contributions), before);
  });

  test("restoring brings it back", () => {
    let data = archiveChallenge(withChallenge(), "c1", NOW);
    data = restoreChallenge(data, "c1");
    assert.equal(data.challenges[0].archivedAt, null);
    assert.equal(completeStep(data, "c1", 0, NOW).contributions.length, 1);
  });

  test("deleting takes the challenge and its money together", () => {
    let data = withChallenge();
    data = completeStep(data, "c1", 0, NOW);
    data = completeStep(data, "c1", 1, NOW);
    data = addContribution(
      data,
      { goalId: "g1", amountCents: 500_00, date: TODAY, note: "Payday" },
      NOW,
    );

    const after = deleteChallenge(data, "c1", NOW);
    assert.equal(after.challenges.length, 0);
    assert.equal(after.contributions.length, 1, "only the unrelated row is left");
    assert.equal(after.contributions[0].note, "Payday");
    assert.equal(balanceCents(after.goals[0], after.contributions), 500_00);
  });

  test("deleting reconciles a goal that was only complete because of it", () => {
    const data = completeStep(withChallenge({ targetCents: 1_00 }), "c1", 0, NOW);
    assert.ok(data.goals[0].completedAt);

    const after = deleteChallenge(data, "c1", NOW);
    assert.equal(after.goals[0].completedAt, null);
    assert.ok(!isComplete(after.goals[0], after.contributions));
  });

  test("deleting an unknown challenge changes nothing", () => {
    const data = withChallenge();
    assert.equal(deleteChallenge(data, "nope", NOW), data);
  });

  test("deleting the goal takes its challenges with it", () => {
    const data = completeStep(withChallenge(), "c1", 0, NOW);
    const after = deleteGoal(data, "g1");
    assert.equal(after.challenges.length, 0);
    assert.equal(after.contributions.length, 0);
    assert.equal(after.goals.length, 0);
  });
});

/* ── Persistence ─────────────────────────────────────────────────────────── */

describe("challenges survive a reload", () => {
  const storage = (): StorageLike => {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  };

  test("the schedule and its ticked steps both come back", () => {
    const s = storage();
    let data = withChallenge();
    data = completeStep(data, "c1", 0, NOW);
    data = completeStep(data, "c1", 4, NOW);
    writeDataset(s, "real", data);

    const back = readDataset(s, "real").data;
    assert.equal(back.challenges.length, 1);
    assert.deepEqual(back.challenges[0].stepCents, data.challenges[0].stepCents);

    const progress = challengeProgress(back.challenges[0], back.contributions);
    assert.equal(progress.stepsDone, 2);
    assert.equal(progress.savedCents, 1_00 + 5_00);
  });

  test("a dataset saved before challenges existed still loads", () => {
    const s = storage();
    // Exactly what an older build wrote: no challenges key at all.
    s.setItem(
      "cnt.goals.v1.real",
      JSON.stringify({ schemaVersion: 1, goals: [goal()], contributions: [], celebrated: [] }),
    );
    const { data, recovered } = readDataset(s, "real");
    assert.equal(recovered, undefined, "not treated as corrupt");
    assert.deepEqual(data.challenges, []);
    assert.equal(data.goals.length, 1);
  });
});
