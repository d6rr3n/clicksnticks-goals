import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOCATION_NOTE,
  catchUpCents,
  monthsUntil,
  planFromAmounts,
  plannedContributions,
  shareByWeight,
  smartAllocate,
  type Allocation,
} from "../allocate";
import { balanceCents, remainingCents } from "../calc";
import { addContributions } from "../store/mutations";
import { emptyDataset } from "../schema";
import { toISODate } from "../dates";
import { makeContribution, makeGoal, NOW } from "./helpers";

const AVAILABLE = 1000_00;

/** Money assigned to a named goal in a plan. */
const got = (plan: ReturnType<typeof smartAllocate>, id: string): number =>
  plan.allocations.find((a) => a.goalId === id)?.amountCents ?? 0;

const entry = (plan: ReturnType<typeof smartAllocate>, id: string): Allocation =>
  plan.allocations.find((a) => a.goalId === id)!;

/* ── Building blocks ─────────────────────────────────────────────────────── */

describe("months until a date", () => {
  test("counts whole months ahead", () => {
    assert.equal(monthsUntil("2027-09-12", NOW), 12);
    assert.equal(monthsUntil("2027-03-12", NOW), 6);
  });

  test("a date in the past leaves no months", () => {
    assert.equal(monthsUntil("2020-01-01", NOW), 0);
  });

  test("no date at all is null, not zero", () => {
    assert.equal(monthsUntil(undefined, NOW), null);
  });
});

describe("catch-up amount", () => {
  test("is what the rate will not cover before the target date", () => {
    // $10,000 remaining, $100/month, 12 months left -> $1,200 covered.
    const g = makeGoal({
      targetCents: 10_000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly", targetDate: "2027-09-12",
    });
    assert.equal(catchUpCents(g, [], NOW), 10_000_00 - 1_200_00);
  });

  test("is zero for a goal that will arrive in time", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 500_00, frequency: "monthly", targetDate: "2027-09-12",
    });
    assert.equal(catchUpCents(g, [], NOW), 0);
  });

  test("is the whole balance when nothing is being contributed", () => {
    const g = makeGoal({
      targetCents: 500_00, openingBalanceCents: 0,
      contributionCents: 0, targetDate: "2027-09-12",
    });
    assert.equal(catchUpCents(g, [], NOW), 500_00);
  });

  test("is zero for a completed goal", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(catchUpCents(g, [], NOW), 0);
  });
});

describe("sharing cents exactly", () => {
  test("the parts always sum to the whole", () => {
    for (const total of [100, 1000, 99_99, 1_000_00, 7]) {
      for (const weights of [[1, 1, 1], [3, 2, 1], [30, 25, 20], [1], [5, 5]]) {
        const parts = shareByWeight(total, weights);
        assert.equal(parts.reduce((a, b) => a + b, 0), total,
          `${total} over ${weights} lost or gained a cent`);
      }
    }
  });

  test("an indivisible amount goes to the largest share first", () => {
    assert.deepEqual(shareByWeight(10, [2, 1]), [7, 3]);
    assert.deepEqual(shareByWeight(1, [1, 1]), [1, 0]);
  });

  test("no weight means no money, and never NaN", () => {
    assert.deepEqual(shareByWeight(100, [0, 0]), [0, 0]);
    assert.deepEqual(shareByWeight(0, [1, 2]), [0, 0]);
  });
});

/* ── The plan ────────────────────────────────────────────────────────────── */

describe("a single eligible goal", () => {
  const g = makeGoal({
    id: "only", name: "Only", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2028-09-12",
  });

  test("takes the whole amount", () => {
    const plan = smartAllocate([g], [], AVAILABLE, NOW);
    assert.equal(got(plan, "only"), AVAILABLE);
    assert.equal(plan.unallocatedCents, 0);
  });

  test("never more than it still needs", () => {
    const small = makeGoal({ ...g, id: "small", targetCents: 300_00 });
    const plan = smartAllocate([small], [], AVAILABLE, NOW);
    assert.equal(got(plan, "small"), 300_00);
    assert.equal(plan.unallocatedCents, AVAILABLE - 300_00);
  });
});

describe("several goals", () => {
  const behind = makeGoal({
    id: "behind", name: "Behind", targetCents: 20_000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2028-09-12",
    priority: "medium",
  });
  const onTrack = makeGoal({
    id: "ontrack", name: "On track", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 500_00, frequency: "monthly", targetDate: "2029-09-12",
    priority: "medium",
  });

  test("every dollar is accounted for", () => {
    const plan = smartAllocate([behind, onTrack], [], AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents + plan.unallocatedCents, AVAILABLE);
  });

  test("the behind goal gets the larger share", () => {
    const plan = smartAllocate([behind, onTrack], [], AVAILABLE, NOW);
    assert.ok(got(plan, "behind") > got(plan, "ontrack"),
      `behind ${got(plan, "behind")} should beat on-track ${got(plan, "ontrack")}`);
  });

  test("a nearer deadline pulls money towards it", () => {
    const soon = makeGoal({
      id: "soon", name: "Soon", targetCents: 20_000_00, openingBalanceCents: 0,
      contributionCents: 500_00, frequency: "monthly", targetDate: "2027-01-12",
      priority: "medium",
    });
    const later = makeGoal({ ...soon, id: "later", name: "Later", targetDate: "2033-09-12" });
    const plan = smartAllocate([soon, later], [], AVAILABLE, NOW);
    assert.ok(got(plan, "soon") > got(plan, "later"));
  });

  test("priority pulls money towards it, all else equal", () => {
    const base = {
      targetCents: 20_000_00, openingBalanceCents: 0, contributionCents: 500_00,
      frequency: "monthly" as const, targetDate: "2030-09-12",
    };
    const high = makeGoal({ ...base, id: "high", name: "High", priority: "high" });
    const low = makeGoal({ ...base, id: "low", name: "Low", priority: "low" });
    const plan = smartAllocate([high, low], [], AVAILABLE, NOW);
    assert.ok(got(plan, "high") > got(plan, "low"));
  });

  test("a goal comfortably ahead takes a smaller share than an equal goal on track", () => {
    const base = {
      targetCents: 20_000_00, openingBalanceCents: 0,
      frequency: "monthly" as const, targetDate: "2030-09-12", priority: "medium" as const,
    };
    // Far more than needed -> lands years early.
    const ahead = makeGoal({ ...base, id: "ahead", name: "Ahead", contributionCents: 2000_00 });
    const level = makeGoal({ ...base, id: "level", name: "Level", contributionCents: 400_00 });
    const plan = smartAllocate([ahead, level], [], AVAILABLE, NOW);
    assert.equal(entry(plan, "ahead").factors.comfortablyAhead, true);
    assert.ok(got(plan, "ahead") < got(plan, "level"));
  });

  test("a big target does not win money on size alone", () => {
    const base = {
      openingBalanceCents: 0, contributionCents: 500_00,
      frequency: "monthly" as const, targetDate: "2030-09-12", priority: "medium" as const,
    };
    const huge = makeGoal({ ...base, id: "huge", name: "Huge", targetCents: 900_000_00 });
    const modest = makeGoal({ ...base, id: "modest", name: "Modest", targetCents: 30_000_00 });
    const plan = smartAllocate([huge, modest], [], AVAILABLE, NOW);
    // Identical weights, so an identical split — size is not a factor.
    assert.equal(got(plan, "huge"), got(plan, "modest"));
  });
});

describe("exclusions", () => {
  const active = makeGoal({
    id: "active", name: "Active", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, targetDate: "2029-09-12",
  });

  test("a completed goal gets nothing but is still listed", () => {
    const done = makeGoal({ id: "done", name: "Done", targetCents: 100_00, openingBalanceCents: 100_00 });
    const plan = smartAllocate([active, done], [], AVAILABLE, NOW);
    const e = entry(plan, "done");
    assert.equal(e.amountCents, 0);
    assert.equal(e.eligible, false);
    assert.equal(e.reason, "complete");
  });

  test("an archived goal gets nothing but is still listed", () => {
    const archived = makeGoal({
      id: "arch", name: "Archived", targetCents: 5000_00, openingBalanceCents: 0,
      archivedAt: "2026-01-01T00:00:00.000Z",
    });
    const plan = smartAllocate([active, archived], [], AVAILABLE, NOW);
    assert.equal(entry(plan, "arch").reason, "archived");
    assert.equal(got(plan, "arch"), 0);
  });

  test("a goal with no target amount gets nothing but is still listed", () => {
    const noTarget = makeGoal({ id: "nt", name: "No target", targetCents: 0, openingBalanceCents: 0 });
    const plan = smartAllocate([active, noTarget], [], AVAILABLE, NOW);
    assert.equal(entry(plan, "nt").reason, "no-target");
    assert.equal(got(plan, "nt"), 0);
  });

  test("all goals complete leaves the whole amount unallocated", () => {
    const a = makeGoal({ id: "a", targetCents: 100_00, openingBalanceCents: 100_00 });
    const b = makeGoal({ id: "b", targetCents: 200_00, openingBalanceCents: 200_00 });
    const plan = smartAllocate([a, b], [], AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents, 0);
    assert.equal(plan.unallocatedCents, AVAILABLE);
  });

  test("all goals archived leaves the whole amount unallocated", () => {
    const a = makeGoal({ id: "a", archivedAt: "2026-01-01T00:00:00.000Z" });
    const plan = smartAllocate([a], [], AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents, 0);
    assert.equal(plan.unallocatedCents, AVAILABLE);
  });

  test("no goals at all is handled", () => {
    const plan = smartAllocate([], [], AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents, 0);
    assert.equal(plan.unallocatedCents, AVAILABLE);
    assert.deepEqual(plan.allocations, []);
  });
});

describe("limits and money safety", () => {
  const goals = [
    makeGoal({ id: "a", name: "A", targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12" }),
    makeGoal({ id: "b", name: "B", targetCents: 2000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12" }),
  ];

  test("the total never exceeds what is available", () => {
    for (const available of [1, 99, 500_00, 3000_00, 9_999_999_00]) {
      const plan = smartAllocate(goals, [], available, NOW);
      assert.ok(plan.totalAllocatedCents <= available,
        `allocated ${plan.totalAllocatedCents} of ${available}`);
    }
  });

  test("no goal receives more than it still needs", () => {
    const plan = smartAllocate(goals, [], 9_999_999_00, NOW);
    for (const a of plan.allocations) {
      assert.ok(a.amountCents <= a.factors.remainingCents,
        `${a.name} got ${a.amountCents} but needs ${a.factors.remainingCents}`);
    }
  });

  test("an amount larger than every goal combined leaves a visible surplus", () => {
    const plan = smartAllocate(goals, [], 10_000_00, NOW);
    assert.equal(plan.totalAllocatedCents, 3000_00);
    assert.equal(plan.unallocatedCents, 7000_00);
  });

  test("no allocation is ever negative", () => {
    const plan = smartAllocate(goals, [], AVAILABLE, NOW);
    assert.ok(plan.allocations.every((a) => a.amountCents >= 0));
  });

  test("nothing is NaN", () => {
    const plan = smartAllocate(goals, [], AVAILABLE, NOW);
    assert.ok(Number.isFinite(plan.totalAllocatedCents));
    assert.ok(Number.isFinite(plan.unallocatedCents));
    assert.ok(plan.allocations.every((a) => Number.isFinite(a.amountCents)));
  });

  test("zero available allocates nothing", () => {
    const plan = smartAllocate(goals, [], 0, NOW);
    assert.equal(plan.totalAllocatedCents, 0);
    assert.equal(plan.unallocatedCents, 0);
  });

  test("a negative or invalid amount is treated as nothing", () => {
    for (const bad of [-500_00, Number.NaN, Number.POSITIVE_INFINITY]) {
      const plan = smartAllocate(goals, [], bad, NOW);
      assert.equal(plan.availableCents, 0);
      assert.equal(plan.totalAllocatedCents, 0);
      assert.ok(plan.allocations.every((a) => a.amountCents === 0));
    }
  });

  test("odd cents are split without loss", () => {
    const plan = smartAllocate(goals, [], 1_00_01, NOW);
    assert.equal(plan.totalAllocatedCents + plan.unallocatedCents, 1_00_01);
  });
});

describe("determinism", () => {
  const goals = [
    makeGoal({ id: "a", name: "A", targetCents: 5000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12", priority: "high" }),
    makeGoal({ id: "b", name: "B", targetCents: 5000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12", priority: "medium" }),
    makeGoal({ id: "c", name: "C", targetCents: 5000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12", priority: "low" }),
  ];

  test("the same inputs always produce the same plan", () => {
    const first = smartAllocate(goals, [], AVAILABLE, NOW);
    for (let i = 0; i < 5; i++) {
      const again = smartAllocate(goals, [], AVAILABLE, NOW);
      assert.deepEqual(
        again.allocations.map((a) => [a.goalId, a.amountCents, a.reason]),
        first.allocations.map((a) => [a.goalId, a.amountCents, a.reason]),
      );
    }
  });

  test("the order the goals arrive in does not change the result", () => {
    const forward = smartAllocate(goals, [], AVAILABLE, NOW);
    const backward = smartAllocate([...goals].reverse(), [], AVAILABLE, NOW);
    const byId = (p: typeof forward) =>
      Object.fromEntries(p.allocations.map((a) => [a.goalId, a.amountCents]));
    assert.deepEqual(byId(backward), byId(forward));
  });

  test("goals identical in every respect split predictably", () => {
    const base = {
      targetCents: 5000_00, openingBalanceCents: 0, contributionCents: 100_00,
      targetDate: "2029-09-12", priority: "medium" as const, name: "Twin",
    };
    const twins = [makeGoal({ ...base, id: "t1" }), makeGoal({ ...base, id: "t2" })];
    const plan = smartAllocate(twins, [], 10_01, NOW);
    assert.equal(plan.totalAllocatedCents, 10_01);
    // The odd cent goes to the first by the fixed tiebreak, every time.
    assert.deepEqual(
      smartAllocate(twins, [], 10_01, NOW).allocations.map((a) => a.amountCents),
      plan.allocations.map((a) => a.amountCents),
    );
  });
});

describe("before and after", () => {
  const behind = makeGoal({
    id: "behind", name: "Behind", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2027-09-12",
  });

  test("reports the projection on each side", () => {
    const plan = smartAllocate([behind], [], 4000_00, NOW);
    const e = entry(plan, "behind");
    assert.equal(e.before.kind, "projected");
    assert.equal(e.after.kind, "projected");
    assert.ok(e.impactMonths !== null && e.impactMonths > 0);
  });

  test("a goal brought back on track is flagged", () => {
    const plan = smartAllocate([behind], [], 4000_00, NOW);
    const e = entry(plan, "behind");
    assert.equal(e.factors.behind, true);
    assert.equal(e.backOnTrack, true);
    assert.equal(plan.backOnTrackCount, 1);
  });

  test("the portfolio summary improves", () => {
    const plan = smartAllocate([behind], [], 4000_00, NOW);
    assert.ok(plan.after.onTrackCount >= plan.before.onTrackCount);
    assert.ok(plan.after.totalSavedCents > plan.before.totalSavedCents);
  });

  test("an allocation that finishes a goal says so", () => {
    const plan = smartAllocate([behind], [], 9000_00, NOW);
    const e = entry(plan, "behind");
    assert.equal(e.completesGoal, true);
    assert.equal(e.after.kind, "complete");
    assert.equal(e.reason, "completes-goal");
  });

  test("the hypothetical contributions are never part of the real ledger", () => {
    const plan = smartAllocate([behind], [], 4000_00, NOW);
    const planned = plannedContributions(plan.allocations, NOW);
    assert.equal(planned.length, 1);
    assert.equal(planned[0].note, ALLOCATION_NOTE);
    assert.equal(planned[0].date, toISODate(NOW));
    // The goal's real balance is untouched.
    assert.equal(balanceCents(behind, []), 0);
  });
});

describe("applying a plan", () => {
  const goals = [
    makeGoal({ id: "a", name: "A", targetCents: 5000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12" }),
    makeGoal({ id: "b", name: "B", targetCents: 5000_00, openingBalanceCents: 0,
      contributionCents: 100_00, targetDate: "2029-09-12" }),
  ];

  test("creates contributions whose totals match the plan exactly", () => {
    const plan = smartAllocate(goals, [], AVAILABLE, NOW);
    const data = addContributions(
      { ...emptyDataset(), goals },
      plan.allocations
        .filter((a) => a.amountCents > 0)
        .map((a) => ({
          goalId: a.goalId, amountCents: a.amountCents,
          date: toISODate(NOW), note: ALLOCATION_NOTE,
        })),
      NOW,
    );

    for (const g of goals) {
      assert.equal(balanceCents(g, data.contributions), got(plan, g.id));
    }
    assert.equal(
      data.contributions.reduce((s, c) => s + c.amountCents, 0),
      plan.totalAllocatedCents,
    );
  });

  test("every created contribution is marked as Smart Allocation", () => {
    const plan = smartAllocate(goals, [], AVAILABLE, NOW);
    const data = addContributions(
      { ...emptyDataset(), goals },
      plan.allocations
        .filter((a) => a.amountCents > 0)
        .map((a) => ({
          goalId: a.goalId, amountCents: a.amountCents,
          date: toISODate(NOW), note: ALLOCATION_NOTE,
        })),
      NOW,
    );
    assert.ok(data.contributions.every((c) => c.note === ALLOCATION_NOTE));
  });

  test("the batch lands whole, with unique ids", () => {
    const data = addContributions(
      { ...emptyDataset(), goals },
      [
        { goalId: "a", amountCents: 100_00, date: toISODate(NOW) },
        { goalId: "b", amountCents: 200_00, date: toISODate(NOW) },
        { goalId: "a", amountCents: 300_00, date: toISODate(NOW) },
      ],
      NOW,
    );
    assert.equal(data.contributions.length, 3);
    assert.equal(new Set(data.contributions.map((c) => c.id)).size, 3);
  });

  test("an empty batch leaves the dataset untouched", () => {
    const before = { ...emptyDataset(), goals };
    assert.equal(addContributions(before, [], NOW), before);
    assert.equal(addContributions(before, [{ goalId: "a", amountCents: 0, date: toISODate(NOW) }], NOW), before);
  });

  test("applying the plan leaves each goal needing exactly what the plan predicted", () => {
    const plan = smartAllocate(goals, [], AVAILABLE, NOW);
    const data = addContributions(
      { ...emptyDataset(), goals },
      plan.allocations
        .filter((a) => a.amountCents > 0)
        .map((a) => ({ goalId: a.goalId, amountCents: a.amountCents, date: toISODate(NOW) })),
      NOW,
    );
    for (const g of goals) {
      const predicted = entry(plan, g.id).factors.remainingCents - got(plan, g.id);
      assert.equal(remainingCents(g, data.contributions), predicted);
    }
  });
});

describe("timezone behaviour", () => {
  const g = makeGoal({
    id: "g", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2027-09-12",
  });

  test("the plan is the same at any hour of the day", () => {
    const shapes = [0, 6, 9, 12, 18, 23].map((hour) => {
      const plan = smartAllocate([g], [], AVAILABLE, new Date(2026, 8, 12, hour, 30));
      return plan.allocations.map((a) => [a.goalId, a.amountCents, a.reason]);
    });
    for (const shape of shapes) assert.deepEqual(shape, shapes[0]);
  });

  test("planned contributions carry today's local date", () => {
    const early = new Date(2026, 8, 12, 7, 30);
    const plan = smartAllocate([g], [], AVAILABLE, early);
    assert.equal(plannedContributions(plan.allocations, early)[0].date, "2026-09-12");
  });

  test("an existing ledger is respected", () => {
    const plan = smartAllocate([g], [makeContribution("g", 4000_00, "2026-01-01")], AVAILABLE, NOW);
    assert.equal(got(plan, "g"), 1000_00);
  });
});

describe("an adjusted plan", () => {
  const a = makeGoal({
    id: "a", name: "A", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2029-09-12",
  });
  const b = makeGoal({
    id: "b", name: "B", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2029-09-12",
  });

  test("feeding the recommendation back in reproduces it exactly", () => {
    const recommended = smartAllocate([a, b], [], AVAILABLE, NOW);
    const amounts = Object.fromEntries(
      recommended.allocations.map((x) => [x.goalId, x.amountCents]),
    );
    const rebuilt = planFromAmounts([a, b], [], amounts, AVAILABLE, NOW);
    assert.deepEqual(
      rebuilt.allocations.map((x) => [x.goalId, x.amountCents, x.reason]),
      recommended.allocations.map((x) => [x.goalId, x.amountCents, x.reason]),
    );
    assert.equal(rebuilt.totalAllocatedCents, recommended.totalAllocatedCents);
  });

  test("a hand-chosen split is honoured", () => {
    const plan = planFromAmounts([a, b], [], { a: 700_00, b: 300_00 }, AVAILABLE, NOW);
    assert.equal(got(plan, "a"), 700_00);
    assert.equal(got(plan, "b"), 300_00);
    assert.equal(plan.unallocatedCents, 0);
  });

  test("an amount beyond what a goal needs is trimmed to what it needs", () => {
    const plan = planFromAmounts([a], [], { a: 99_999_00 }, 99_999_00, NOW);
    assert.equal(got(plan, "a"), 5000_00);
  });

  test("a negative amount becomes nothing", () => {
    const plan = planFromAmounts([a, b], [], { a: -500_00, b: 200_00 }, AVAILABLE, NOW);
    assert.equal(got(plan, "a"), 0);
    assert.equal(got(plan, "b"), 200_00);
  });

  test("underspending leaves the rest visibly unallocated", () => {
    const plan = planFromAmounts([a, b], [], { a: 100_00, b: 100_00 }, AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents, 200_00);
    assert.equal(plan.unallocatedCents, 800_00);
  });

  test("the before/after preview follows the adjusted amounts", () => {
    const light = planFromAmounts([a], [], { a: 100_00 }, AVAILABLE, NOW);
    const heavy = planFromAmounts([a], [], { a: 4000_00 }, AVAILABLE, NOW);
    assert.ok((heavy.allocations[0].impactMonths ?? 0) > (light.allocations[0].impactMonths ?? 0));
    assert.ok(heavy.after.totalSavedCents > light.after.totalSavedCents);
  });

  test("ineligible goals cannot be given money by hand", () => {
    const done = makeGoal({ id: "done", name: "Done", targetCents: 100_00, openingBalanceCents: 100_00 });
    const plan = planFromAmounts([a, done], [], { a: 0, done: 500_00 }, AVAILABLE, NOW);
    assert.equal(got(plan, "done"), 0);
    assert.equal(entry(plan, "done").eligible, false);
  });

  test("an empty adjustment allocates nothing", () => {
    const plan = planFromAmounts([a, b], [], {}, AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents, 0);
    assert.equal(plan.unallocatedCents, AVAILABLE);
  });
});

describe("the plan always spreads", () => {
  /*
   * A badly-behind goal can need many times the amount available. Without a
   * cap on the catch-up pass it absorbs everything and every other goal is
   * handed nothing, which is neither useful nor easy to explain.
   */
  const hopeless = makeGoal({
    id: "hopeless", name: "Hopeless", targetCents: 200_000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2027-09-12",
    priority: "medium",
  });
  const steady = makeGoal({
    id: "steady", name: "Steady", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 300_00, frequency: "monthly", targetDate: "2029-09-12",
    priority: "medium",
  });
  const nearby = makeGoal({
    id: "nearby", name: "Nearby", targetCents: 3000_00, openingBalanceCents: 0,
    contributionCents: 400_00, frequency: "monthly", targetDate: "2027-03-12",
    priority: "medium",
  });

  test("a goal whose catch-up dwarfs the money does not take all of it", () => {
    const plan = smartAllocate([hopeless, steady, nearby], [], AVAILABLE, NOW);
    assert.ok(got(plan, "hopeless") < AVAILABLE,
      `hopeless took ${got(plan, "hopeless")} of ${AVAILABLE}`);
    assert.ok(got(plan, "steady") > 0, "steady got nothing");
    assert.ok(got(plan, "nearby") > 0, "nearby got nothing");
  });

  test("the behind goals both outrank the comfortable one", () => {
    // "nearby" is behind too, and due sooner, so it legitimately outranks
    // "hopeless" — behind plus a near deadline beats behind alone.
    const plan = smartAllocate([hopeless, steady, nearby], [], AVAILABLE, NOW);
    assert.equal(entry(plan, "nearby").factors.behind, true);
    assert.equal(entry(plan, "hopeless").factors.behind, true);
    assert.equal(entry(plan, "steady").factors.behind, false);
    assert.ok(got(plan, "hopeless") > got(plan, "steady"));
    assert.ok(got(plan, "nearby") > got(plan, "steady"));
  });

  test("every dollar is still accounted for", () => {
    const plan = smartAllocate([hopeless, steady, nearby], [], AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents + plan.unallocatedCents, AVAILABLE);
  });

  test("with no behind goals the whole amount still spreads", () => {
    const plan = smartAllocate([steady, nearby], [], AVAILABLE, NOW);
    assert.equal(plan.totalAllocatedCents, AVAILABLE);
    assert.ok(got(plan, "steady") > 0 && got(plan, "nearby") > 0);
  });

  test("a catch-up that fits comfortably is still fully funded", () => {
    const nearlyThere = makeGoal({
      id: "near", name: "Nearly", targetCents: 1000_00, openingBalanceCents: 500_00,
      contributionCents: 0, targetDate: "2027-01-12", priority: "high",
    });
    const plan = smartAllocate([nearlyThere], [], AVAILABLE, NOW);
    assert.equal(got(plan, "near"), 500_00);
    assert.equal(entry(plan, "near").completesGoal, true);
  });
});
