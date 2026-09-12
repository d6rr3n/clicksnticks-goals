import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  balanceCents,
  dashboardTotals,
  forecastSeries,
  isComplete,
  isOnTrack,
  monthlyRateCents,
  monthsRemaining,
  paceGap,
  percentComplete,
  projectedCompletion,
  remainingCents,
  runningBalances,
  statusOf,
} from "../calc";
import { makeContribution, makeGoal, NOW } from "./helpers";

describe("balance", () => {
  test("opening balance alone, with no ledger", () => {
    const g = makeGoal({ openingBalanceCents: 500_00 });
    assert.equal(balanceCents(g, []), 500_00);
  });

  test("opening balance plus contributions", () => {
    const g = makeGoal({ openingBalanceCents: 100_00 });
    const c = [makeContribution(g.id, 50_00), makeContribution(g.id, 25_00)];
    assert.equal(balanceCents(g, c), 175_00);
  });

  test("withdrawals reduce the balance", () => {
    const g = makeGoal({ openingBalanceCents: 100_00 });
    assert.equal(balanceCents(g, [makeContribution(g.id, -30_00)]), 70_00);
  });

  test("another goal's contributions are ignored", () => {
    const a = makeGoal();
    const b = makeGoal();
    assert.equal(balanceCents(a, [makeContribution(b.id, 999_00)]), 0);
  });
});

describe("percentage complete", () => {
  test("half way", () => {
    const g = makeGoal({ targetCents: 1000_00, openingBalanceCents: 500_00 });
    assert.equal(percentComplete(g, []), 0.5);
  });

  test("clamps at 100% when overshooting", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 250_00 });
    assert.equal(percentComplete(g, []), 1);
  });

  test("never negative", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 0 });
    assert.equal(percentComplete(g, [makeContribution(g.id, -50_00)]), 0);
  });

  test("zero target does not divide by zero", () => {
    const g = makeGoal({ targetCents: 0, openingBalanceCents: 100_00 });
    assert.equal(percentComplete(g, []), 0);
  });
});

describe("amount remaining", () => {
  test("target less balance", () => {
    const g = makeGoal({ targetCents: 1000_00, openingBalanceCents: 400_00 });
    assert.equal(remainingCents(g, []), 600_00);
  });

  test("floors at zero when overshooting", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 180_00 });
    assert.equal(remainingCents(g, []), 0);
  });
});

describe("completion", () => {
  test("exactly on target counts as complete", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(isComplete(g, []), true);
    assert.equal(statusOf(g, [], NOW), "complete");
  });

  test("one cent short is not complete", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 99_99 });
    assert.equal(isComplete(g, []), false);
  });

  test("deleting a contribution can un-complete a goal", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 60_00 });
    const c = makeContribution(g.id, 40_00);
    assert.equal(isComplete(g, [c]), true);
    assert.equal(isComplete(g, []), false); // contribution removed
  });
});

describe("contribution frequency", () => {
  test("weekly uses 52 payments a year, not 4 a month", () => {
    const g = makeGoal({ contributionCents: 100_00, frequency: "weekly" });
    assert.equal(monthlyRateCents(g), Math.round(100_00 * (52 / 12)));
    assert.equal(monthlyRateCents(g), 43333);
  });

  test("fortnightly uses 26 payments a year", () => {
    const g = makeGoal({ contributionCents: 100_00, frequency: "fortnightly" });
    assert.equal(monthlyRateCents(g), Math.round(100_00 * (26 / 12)));
    assert.equal(monthlyRateCents(g), 21667);
  });

  test("monthly passes straight through", () => {
    const g = makeGoal({ contributionCents: 100_00, frequency: "monthly" });
    assert.equal(monthlyRateCents(g), 100_00);
  });

  test("weekly reaches a target faster than monthly", () => {
    const base = { targetCents: 5000_00, openingBalanceCents: 0, contributionCents: 100_00 };
    const w = monthsRemaining(makeGoal({ ...base, frequency: "weekly" }), []);
    const f = monthsRemaining(makeGoal({ ...base, frequency: "fortnightly" }), []);
    const m = monthsRemaining(makeGoal({ ...base, frequency: "monthly" }), []);
    assert.ok(w !== null && f !== null && m !== null);
    assert.ok(w < f && f < m, `expected weekly ${w} < fortnightly ${f} < monthly ${m}`);
  });
});

describe("projected completion", () => {
  test("ten months at $100 a month for $1000 remaining", () => {
    const g = makeGoal({
      targetCents: 1000_00,
      openingBalanceCents: 0,
      contributionCents: 100_00,
      frequency: "monthly",
    });
    const projected = projectedCompletion(g, [], NOW);
    assert.ok(projected);
    assert.equal(projected.getFullYear(), 2027);
    assert.equal(projected.getMonth(), 6); // July 2027, ten months on
  });

  test("returns null when nothing is being contributed", () => {
    const g = makeGoal({ contributionCents: 0 });
    assert.equal(projectedCompletion(g, [], NOW), null);
  });

  test("a completed goal projects to now", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(projectedCompletion(g, [], NOW), NOW);
  });

  test("partial months round up — you cannot half-pay", () => {
    const g = makeGoal({
      targetCents: 150_00,
      openingBalanceCents: 0,
      contributionCents: 100_00,
      frequency: "monthly",
    });
    assert.equal(monthsRemaining(g, []), 2);
  });
});

describe("on track", () => {
  test("on track when the rate lands before the target date", () => {
    const g = makeGoal({
      targetCents: 1000_00,
      openingBalanceCents: 0,
      contributionCents: 200_00,
      frequency: "monthly",
      targetDate: "2027-09-12",
    });
    assert.equal(isOnTrack(g, [], NOW), true);
    assert.equal(statusOf(g, [], NOW), "on-track");
  });

  test("behind when the rate lands after the target date", () => {
    const g = makeGoal({
      targetCents: 10_000_00,
      openingBalanceCents: 0,
      contributionCents: 50_00,
      frequency: "monthly",
      targetDate: "2027-01-01",
    });
    assert.equal(isOnTrack(g, [], NOW), false);
    assert.equal(statusOf(g, [], NOW), "behind");
  });

  test("a goal with no contributions is behind, not on track", () => {
    const g = makeGoal({ contributionCents: 0, openingBalanceCents: 0 });
    assert.equal(isOnTrack(g, [], NOW), false);
  });

  test("a completed goal is always on track", () => {
    const g = makeGoal({
      targetCents: 100_00,
      openingBalanceCents: 100_00,
      contributionCents: 0,
      targetDate: "2026-01-01",
    });
    assert.equal(isOnTrack(g, [], NOW), true);
  });

  test("pace gap is positive when ahead of the timeline", () => {
    const g = makeGoal({
      targetCents: 100_00,
      openingBalanceCents: 90_00,
      createdAt: "2026-01-01T00:00:00.000Z",
      targetDate: "2027-01-01",
    });
    assert.ok(paceGap(g, [], NOW) > 0);
  });
});

describe("running balances", () => {
  test("accumulates from the opening balance in date order", () => {
    const g = makeGoal({ openingBalanceCents: 100_00 });
    const rows = runningBalances(g, [
      makeContribution(g.id, 50_00, "2026-03-01"),
      makeContribution(g.id, 25_00, "2026-01-01"),
      makeContribution(g.id, -10_00, "2026-02-01"),
    ]);
    assert.deepEqual(
      rows.map((r) => r.balanceAfterCents),
      [125_00, 115_00, 165_00],
    );
  });

  test("same-day contributions keep a stable order", () => {
    const g = makeGoal();
    const a = makeContribution(g.id, 10_00, "2026-05-01", {
      id: "a", createdAt: "2026-05-01T09:00:00.000Z",
    });
    const b = makeContribution(g.id, 20_00, "2026-05-01", {
      id: "b", createdAt: "2026-05-01T10:00:00.000Z",
    });
    assert.deepEqual(runningBalances(g, [b, a]).map((r) => r.id), ["a", "b"]);
  });

  test("final running balance equals the computed balance", () => {
    const g = makeGoal({ openingBalanceCents: 33_33 });
    const c = [
      makeContribution(g.id, 11_11, "2026-01-01"),
      makeContribution(g.id, 22_22, "2026-02-01"),
    ];
    const rows = runningBalances(g, c);
    assert.equal(rows[rows.length - 1].balanceAfterCents, balanceCents(g, c));
  });
});

describe("editing and deleting contributions", () => {
  const g = makeGoal({ targetCents: 1000_00, openingBalanceCents: 0 });
  const original = makeContribution(g.id, 100_00, "2026-06-01");

  test("adding updates every derived figure", () => {
    assert.equal(balanceCents(g, []), 0);
    assert.equal(balanceCents(g, [original]), 100_00);
    assert.equal(percentComplete(g, [original]), 0.1);
    assert.equal(remainingCents(g, [original]), 900_00);
  });

  test("editing the amount recomputes rather than patches", () => {
    const edited = { ...original, amountCents: 250_00 };
    assert.equal(balanceCents(g, [edited]), 250_00);
    assert.equal(remainingCents(g, [edited]), 750_00);
    assert.equal(percentComplete(g, [edited]), 0.25);
  });

  test("deleting reverts the balance exactly", () => {
    const ledger = [original, makeContribution(g.id, 400_00, "2026-07-01")];
    assert.equal(balanceCents(g, ledger), 500_00);
    const afterDelete = ledger.filter((c) => c.id !== original.id);
    assert.equal(balanceCents(g, afterDelete), 400_00);
  });

  test("repeated add and remove leaves no drift", () => {
    let ledger = [...Array(100)].map((_, i) =>
      makeContribution(g.id, 10, `2026-01-01`, { id: `d${i}` }),
    );
    assert.equal(balanceCents(g, ledger), 1000);
    ledger = ledger.filter((_, i) => i % 2 === 0);
    assert.equal(balanceCents(g, ledger), 500);
  });
});

describe("dashboard totals", () => {
  const houseId = "house";
  const carId = "car";
  const doneId = "done";

  const goals = [
    makeGoal({ id: houseId, targetCents: 1000_00, openingBalanceCents: 300_00,
      contributionCents: 100_00, frequency: "monthly", targetDate: "2028-09-12" }),
    makeGoal({ id: carId, targetCents: 2000_00, openingBalanceCents: 100_00,
      contributionCents: 10_00, frequency: "monthly", targetDate: "2026-12-01" }),
    makeGoal({ id: doneId, targetCents: 500_00, openingBalanceCents: 500_00,
      contributionCents: 0, targetDate: "2026-10-01" }),
  ];
  const contributions = [
    makeContribution(houseId, 200_00, "2026-09-05"),
    makeContribution(carId, 50_00, "2026-08-05"),
  ];

  test("total saved sums balances across goals", () => {
    const t = dashboardTotals(goals, contributions, NOW);
    assert.equal(t.totalSavedCents, 300_00 + 200_00 + 100_00 + 50_00 + 500_00);
  });

  test("counts active and completed goals", () => {
    const t = dashboardTotals(goals, contributions, NOW);
    assert.equal(t.activeCount, 3);
    assert.equal(t.completedCount, 1);
  });

  test("a completed goal is not removed from the totals", () => {
    const t = dashboardTotals(goals, contributions, NOW);
    assert.ok(t.totalSavedCents >= 500_00);
    assert.equal(t.activeCount, 3);
  });

  test("saved this month counts only this month's contributions", () => {
    const t = dashboardTotals(goals, contributions, NOW);
    assert.equal(t.savedThisMonthCents, 200_00);
  });

  test("archived goals drop out of every total", () => {
    const archived = goals.map((g) =>
      g.id === carId ? { ...g, archivedAt: "2026-09-01T00:00:00.000Z" } : g,
    );
    const t = dashboardTotals(archived, contributions, NOW);
    assert.equal(t.activeCount, 2);
    assert.equal(t.totalSavedCents, 300_00 + 200_00 + 500_00);
  });

  test("on-track count includes completed goals", () => {
    const t = dashboardTotals(goals, contributions, NOW);
    assert.equal(t.onTrackCount, 2); // house on track, done complete, car behind
    assert.ok(Math.abs(t.onTrackFraction - 2 / 3) < 1e-9);
  });

  test("empty dataset yields zeroes, not NaN", () => {
    const t = dashboardTotals([], [], NOW);
    assert.equal(t.totalSavedCents, 0);
    assert.equal(t.activeCount, 0);
    assert.equal(t.onTrackFraction, 0);
    assert.ok(Number.isFinite(t.projectedValueCents));
  });
});

describe("forecast", () => {
  test("starts at today's real balance", () => {
    const g = makeGoal({ openingBalanceCents: 500_00, targetCents: 5000_00 });
    const series = forecastSeries([g], [], NOW, 4);
    assert.equal(series[0].valueCents, 500_00);
    assert.equal(series[0].year, 2026);
  });

  test("rises and never exceeds the combined target", () => {
    const g = makeGoal({
      openingBalanceCents: 0, targetCents: 1000_00,
      contributionCents: 100_00, frequency: "monthly",
    });
    const series = forecastSeries([g], [], NOW, 4);
    for (let i = 1; i < series.length; i++) {
      assert.ok(series[i].valueCents >= series[i - 1].valueCents);
    }
    assert.equal(series[series.length - 1].valueCents, 1000_00);
  });

  test("a goal with no contributions stays flat", () => {
    const g = makeGoal({ openingBalanceCents: 100_00, contributionCents: 0 });
    const series = forecastSeries([g], [], NOW, 4);
    assert.ok(series.every((p) => p.valueCents === 100_00));
  });
});

describe("regressions", () => {
  test("landing exactly on the target date counts as on track", () => {
    // projectedCompletion carries the current time of day; comparing timestamps
    // rather than dates used to call this goal behind.
    const afternoon = new Date(2026, 8, 12, 18, 0);
    const g = makeGoal({
      targetCents: 1000_00,
      openingBalanceCents: 0,
      contributionCents: 100_00,
      frequency: "monthly",
      targetDate: "2027-07-12",
    });
    assert.equal(isOnTrack(g, [], afternoon), true);
    assert.equal(statusOf(g, [], afternoon), "on-track");
  });

  test("on track is judged by date regardless of the time of day", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly", targetDate: "2027-07-12",
    });
    for (const hour of [0, 6, 9, 12, 18, 23]) {
      assert.equal(
        isOnTrack(g, [], new Date(2026, 8, 12, hour, 30)),
        true,
        `expected on track at ${hour}:30`,
      );
    }
  });

  test("one day past the target date is behind", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly", targetDate: "2027-07-11",
    });
    assert.equal(isOnTrack(g, [], new Date(2026, 8, 12, 12, 0)), false);
  });
});
