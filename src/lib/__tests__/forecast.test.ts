import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  monthlyFromPerPeriod,
  monthsAgainstTarget,
  perPeriodFromMonthly,
  portfolioSummary,
  projectionFor,
  rateInAllFrequencies,
  requiredRate,
  simulateExtra,
  simulateLumpSum,
} from "../forecast";
import { forecastHorizon, portfolioForecast } from "../calc";
import { parseDate, toISODate } from "../dates";
import { makeContribution, makeGoal, NOW } from "./helpers";

/* ── Projected completion, by frequency ──────────────────────────────────── */

describe("projected completion", () => {
  test("monthly: $1,000 remaining at $100 a month lands in ten months", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly",
    });
    const p = projectionFor(g, [], NOW);
    assert.equal(p.kind, "projected");
    assert.equal(p.kind === "projected" && p.months, 10);
    assert.equal(p.kind === "projected" && p.date, "2027-07-12");
  });

  test("weekly: $100 a week clears faster than $100 a month", () => {
    const base = { targetCents: 5000_00, openingBalanceCents: 0, contributionCents: 100_00 };
    const w = projectionFor(makeGoal({ ...base, frequency: "weekly" }), [], NOW);
    const m = projectionFor(makeGoal({ ...base, frequency: "monthly" }), [], NOW);
    assert.equal(w.kind === "projected" && w.months, 12); // 433.33/mo
    assert.equal(m.kind === "projected" && m.months, 50);
  });

  test("fortnightly sits between weekly and monthly", () => {
    const base = { targetCents: 5000_00, openingBalanceCents: 0, contributionCents: 100_00 };
    const f = projectionFor(makeGoal({ ...base, frequency: "fortnightly" }), [], NOW);
    assert.equal(f.kind === "projected" && f.months, 24); // 216.67/mo
  });

  test("a completed goal reports complete, not a date", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(projectionFor(g, [], NOW).kind, "complete");
  });

  test("a goal over target still reports complete", () => {
    const g = makeGoal({ targetCents: 100_00, openingBalanceCents: 250_00 });
    assert.equal(projectionFor(g, [], NOW).kind, "complete");
  });

  test("zero contribution reports unable, never a nonsense date", () => {
    const g = makeGoal({ contributionCents: 0, openingBalanceCents: 0 });
    assert.equal(projectionFor(g, [], NOW).kind, "unable");
  });

  test("landing exactly on the target date counts as on track", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly", targetDate: "2027-07-12",
    });
    const p = projectionFor(g, [], NOW);
    assert.equal(p.kind === "projected" && p.onTrack, true);
    assert.equal(monthsAgainstTarget(g, p), 0);
  });

  test("months against target is positive when early, negative when late", () => {
    const early = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0, contributionCents: 100_00,
      frequency: "monthly", targetDate: "2027-10-12",
    });
    const late = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0, contributionCents: 100_00,
      frequency: "monthly", targetDate: "2027-04-12",
    });
    assert.equal(monthsAgainstTarget(early, projectionFor(early, [], NOW)), 3);
    assert.equal(monthsAgainstTarget(late, projectionFor(late, [], NOW)), -3);
  });

  test("the ledger feeds the projection", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly",
    });
    const withPayment = projectionFor(g, [makeContribution(g.id, 500_00)], NOW);
    assert.equal(withPayment.kind === "projected" && withPayment.months, 5);
  });
});

/* ── Frequency conversion ────────────────────────────────────────────────── */

describe("frequency conversion", () => {
  test("round trips without losing the target", () => {
    for (const f of ["weekly", "fortnightly", "monthly"] as const) {
      const perPeriod = perPeriodFromMonthly(1000_00, f);
      assert.ok(monthlyFromPerPeriod(perPeriod, f) >= 1000_00,
        `${f} must not round below the monthly requirement`);
    }
  });

  test("all three frequencies describe the same monthly rate", () => {
    const r = rateInAllFrequencies(433_33);
    assert.equal(r.monthlyCents, 433_33);
    assert.equal(r.weeklyCents, Math.ceil(433_33 / (52 / 12)));
    assert.equal(r.fortnightlyCents, Math.ceil(433_33 / (26 / 12)));
  });
});

/* ── Scenario A ──────────────────────────────────────────────────────────── */

describe("save more regularly", () => {
  const goal = makeGoal({
    targetCents: 12_000_00, openingBalanceCents: 0,
    contributionCents: 200_00, frequency: "monthly", targetDate: "2030-01-01",
  });

  test("extra monthly brings the date forward", () => {
    const r = simulateExtra(goal, [], { amountCents: 200_00, frequency: "monthly" }, NOW);
    assert.equal(r.baseline.kind === "projected" && r.baseline.months, 60);
    assert.equal(r.scenario.kind === "projected" && r.scenario.months, 30);
    assert.equal(r.monthsSaved, 30);
    assert.equal(r.scenarioMonthlyCents, 400_00);
  });

  test("extra weekly converts at 52 payments a year", () => {
    const r = simulateExtra(goal, [], { amountCents: 50_00, frequency: "weekly" }, NOW);
    assert.equal(r.scenarioMonthlyCents, 200_00 + Math.round(50_00 * (52 / 12)));
    assert.ok(r.monthsSaved !== null && r.monthsSaved > 0);
  });

  test("extra fortnightly converts at 26 payments a year", () => {
    const r = simulateExtra(goal, [], { amountCents: 50_00, frequency: "fortnightly" }, NOW);
    assert.equal(r.scenarioMonthlyCents, 200_00 + Math.round(50_00 * (26 / 12)));
  });

  test("zero extra changes nothing", () => {
    const r = simulateExtra(goal, [], { amountCents: 0, frequency: "monthly" }, NOW);
    assert.equal(r.monthsSaved, 0);
    assert.equal(r.scenarioMonthlyCents, r.baselineMonthlyCents);
  });

  test("a new per-period figure is only given at the goal's own frequency", () => {
    const same = simulateExtra(goal, [], { amountCents: 50_00, frequency: "monthly" }, NOW);
    const other = simulateExtra(goal, [], { amountCents: 50_00, frequency: "weekly" }, NOW);
    assert.equal(same.newPerPeriodCents, 250_00);
    assert.equal(other.newPerPeriodCents, null);
  });

  test("extra on a goal with no contribution becomes projectable", () => {
    const stalled = makeGoal({ targetCents: 1000_00, openingBalanceCents: 0, contributionCents: 0 });
    const r = simulateExtra(stalled, [], { amountCents: 100_00, frequency: "monthly" }, NOW);
    assert.equal(r.baseline.kind, "unable");
    assert.equal(r.scenario.kind === "projected" && r.scenario.months, 10);
    assert.equal(r.monthsSaved, null);
  });

  test("a completed goal has nothing to bring forward", () => {
    const done = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    const r = simulateExtra(done, [], { amountCents: 100_00, frequency: "weekly" }, NOW);
    assert.equal(r.scenario.kind, "complete");
    assert.equal(r.monthsSaved, null);
  });
});

/* ── Scenario B ──────────────────────────────────────────────────────────── */

describe("lump sum", () => {
  const goal = makeGoal({
    targetCents: 10_000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2035-01-01",
  });

  test("brings the date forward and raises the percentage", () => {
    const r = simulateLumpSum(goal, [], 5_000_00, NOW);
    assert.equal(r.baseline.kind === "projected" && r.baseline.months, 100);
    assert.equal(r.scenario.kind === "projected" && r.scenario.months, 50);
    assert.equal(r.monthsSaved, 50);
    assert.equal(r.newBalanceCents, 5_000_00);
    assert.equal(r.newPercentComplete, 0.5);
  });

  test("a lump sum large enough finishes the goal outright", () => {
    const r = simulateLumpSum(goal, [], 10_000_00, NOW);
    assert.equal(r.completesGoal, true);
    assert.equal(r.scenario.kind, "complete");
    assert.equal(r.monthsSaved, 100);
    assert.equal(r.newPercentComplete, 1);
  });

  test("overshooting still clamps to 100%", () => {
    const r = simulateLumpSum(goal, [], 99_000_00, NOW);
    assert.equal(r.newPercentComplete, 1);
    assert.equal(r.completesGoal, true);
  });

  test("zero changes nothing", () => {
    const r = simulateLumpSum(goal, [], 0, NOW);
    assert.equal(r.monthsSaved, 0);
    assert.equal(r.newBalanceCents, 0);
  });

  test("a lump sum on a goal with no contribution raises the balance only", () => {
    const stalled = makeGoal({ targetCents: 1000_00, openingBalanceCents: 0, contributionCents: 0 });
    const r = simulateLumpSum(stalled, [], 500_00, NOW);
    assert.equal(r.scenario.kind, "unable");
    assert.equal(r.newPercentComplete, 0.5);
  });

  test("existing contributions are included in the new balance", () => {
    const r = simulateLumpSum(goal, [makeContribution(goal.id, 1_000_00)], 1_000_00, NOW);
    assert.equal(r.newBalanceCents, 2_000_00);
  });
});

/* ── Scenario C ──────────────────────────────────────────────────────────── */

describe("reach it by", () => {
  const goal = makeGoal({
    targetCents: 12_000_00, openingBalanceCents: 0,
    contributionCents: 200_00, frequency: "monthly", targetDate: "2030-01-01",
  });

  test("solves the required monthly rate", () => {
    const r = requiredRate(goal, [], "2027-09-12", NOW);
    assert.equal(r.kind, "required");
    if (r.kind !== "required") return;
    assert.equal(r.months, 12);
    assert.equal(r.required.monthlyCents, 1000_00);
  });

  test("gives weekly and fortnightly rates that actually reach the target", () => {
    const r = requiredRate(goal, [], "2027-09-12", NOW);
    if (r.kind !== "required") throw new Error("expected a rate");
    // Applying the weekly figure must clear the goal within the window.
    const asMonthly = monthlyFromPerPeriod(r.required.weeklyCents, "weekly");
    assert.ok(Math.ceil(12_000_00 / asMonthly) <= r.months);
    const asMonthlyF = monthlyFromPerPeriod(r.required.fortnightlyCents, "fortnightly");
    assert.ok(Math.ceil(12_000_00 / asMonthlyF) <= r.months);
  });

  test("reports the shortfall against the current rate", () => {
    const r = requiredRate(goal, [], "2027-09-12", NOW);
    if (r.kind !== "required") throw new Error("expected a rate");
    assert.equal(r.deltaMonthlyCents, 1000_00 - 200_00);
    assert.equal(r.alreadyEnough, false);
  });

  test("says so when the current rate is already enough", () => {
    const r = requiredRate(goal, [], "2035-01-01", NOW);
    if (r.kind !== "required") throw new Error("expected a rate");
    assert.equal(r.alreadyEnough, true);
    assert.ok(r.deltaMonthlyCents < 0);
  });

  test("a date in the past is unreachable", () => {
    const r = requiredRate(goal, [], "2020-01-01", NOW);
    assert.equal(r.kind, "unreachable");
    assert.equal(r.kind === "unreachable" && r.reason, "date-passed");
  });

  test("a date under a month away leaves no time for regular saving", () => {
    const r = requiredRate(goal, [], "2026-09-30", NOW);
    assert.equal(r.kind, "unreachable");
    assert.equal(r.kind === "unreachable" && r.reason, "no-time");
  });

  test("an already-complete goal needs nothing", () => {
    const done = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(requiredRate(done, [], "2028-01-01", NOW).kind, "already-complete");
  });

  test("solving for a date then projecting that rate agrees", () => {
    const r = requiredRate(goal, [], "2027-09-12", NOW);
    if (r.kind !== "required") throw new Error("expected a rate");
    const adjusted = makeGoal({
      ...goal, contributionCents: r.required.monthlyCents, frequency: "monthly",
    });
    const p = projectionFor(adjusted, [], NOW);
    assert.ok(p.kind === "projected" && p.months <= r.months);
  });

  test("required rates round up, never leaving the target short", () => {
    const awkward = makeGoal({
      targetCents: 1000_01, openingBalanceCents: 0, contributionCents: 0,
    });
    const r = requiredRate(awkward, [], "2027-09-12", NOW);
    if (r.kind !== "required") throw new Error("expected a rate");
    assert.ok(r.required.monthlyCents * r.months >= 1000_01);
  });
});

/* ── Portfolio ───────────────────────────────────────────────────────────── */

describe("portfolio forecast", () => {
  const a = makeGoal({
    id: "a", name: "Near", targetCents: 1000_00, openingBalanceCents: 0,
    contributionCents: 500_00, frequency: "monthly", targetDate: "2028-01-01",
  });
  const b = makeGoal({
    id: "b", name: "Far", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2032-01-01",
  });

  test("starts at today's real balance", () => {
    const f = portfolioForecast([a, b], [], NOW);
    assert.equal(f.months[0].valueCents, 0);
    assert.equal(f.months[0].date, toISODate(NOW));
  });

  test("rises monthly and never exceeds the combined target", () => {
    const f = portfolioForecast([a, b], [], NOW);
    for (let i = 1; i < f.months.length; i++) {
      assert.ok(f.months[i].valueCents >= f.months[i - 1].valueCents);
    }
    assert.equal(f.months[f.months.length - 1].valueCents, 6000_00);
  });

  test("records a milestone at each goal's completion month", () => {
    const f = portfolioForecast([a, b], [], NOW);
    const near = f.milestones.find((m) => m.goalId === "a");
    const far = f.milestones.find((m) => m.goalId === "b");
    assert.equal(near?.month, 2);
    assert.equal(far?.month, 50);
  });

  test("a goal already complete lands at month zero", () => {
    const done = makeGoal({ id: "d", targetCents: 100_00, openingBalanceCents: 100_00 });
    const f = portfolioForecast([done], [], NOW);
    assert.equal(f.milestones[0].month, 0);
  });

  test("archived goals are excluded entirely", () => {
    const archived = makeGoal({
      id: "z", targetCents: 9999_00, openingBalanceCents: 500_00,
      contributionCents: 100_00, archivedAt: "2026-01-01T00:00:00.000Z",
    });
    const f = portfolioForecast([a, archived], [], NOW);
    assert.equal(f.months[0].valueCents, 0);
    assert.ok(!f.milestones.some((m) => m.goalId === "z"));
  });

  test("a goal with no contribution never lands and marks the forecast truncated", () => {
    const stalled = makeGoal({ id: "s", targetCents: 1000_00, openingBalanceCents: 0, contributionCents: 0 });
    const f = portfolioForecast([stalled], [], NOW);
    assert.equal(f.truncated, true);
    assert.equal(f.milestones.length, 0);
    assert.ok(f.months.every((m) => m.valueCents === 0));
  });

  test("the horizon covers the longest goal and stays within ten years", () => {
    assert.ok(forecastHorizon([a, b], []) >= 50);
    const glacial = makeGoal({ targetCents: 10_000_000_00, openingBalanceCents: 0, contributionCents: 1_00 });
    assert.equal(forecastHorizon([glacial], []), 120);
  });
});

describe("portfolio summary", () => {
  const a = makeGoal({
    id: "a", name: "Near", targetCents: 1000_00, openingBalanceCents: 200_00,
    contributionCents: 500_00, frequency: "monthly", targetDate: "2028-01-01",
  });
  const b = makeGoal({
    id: "b", name: "Far", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2032-01-01",
  });
  const done = makeGoal({
    id: "c", name: "Done", targetCents: 500_00, openingBalanceCents: 500_00, contributionCents: 0,
  });

  test("totals saved and remaining", () => {
    const s = portfolioSummary([a, b, done], [], NOW);
    assert.equal(s.totalSavedCents, 200_00 + 0 + 500_00);
    assert.equal(s.totalRemainingCents, 800_00 + 5000_00);
  });

  test("the combined rate excludes completed goals", () => {
    const s = portfolioSummary([a, b, done], [], NOW);
    assert.equal(s.rate.monthlyCents, 600_00);
  });

  test("names the next and latest goals to land", () => {
    const s = portfolioSummary([a, b, done], [], NOW);
    assert.equal(s.nextToComplete?.goalId, "a");
    assert.equal(s.latestToComplete?.goalId, "b");
  });

  test("counts active, completed and on track", () => {
    const s = portfolioSummary([a, b, done], [], NOW);
    assert.equal(s.activeCount, 3);
    assert.equal(s.completedCount, 1);
    assert.equal(s.onTrackCount, 3);
  });

  test("counts goals that cannot be projected", () => {
    const stalled = makeGoal({ id: "s", targetCents: 100_00, openingBalanceCents: 0, contributionCents: 0 });
    const s = portfolioSummary([a, stalled], [], NOW);
    assert.equal(s.unprojectableCount, 1);
    assert.equal(s.nextToComplete?.goalId, "a");
  });

  test("an empty portfolio yields zeroes, not NaN", () => {
    const s = portfolioSummary([], [], NOW);
    assert.equal(s.totalSavedCents, 0);
    assert.equal(s.rate.monthlyCents, 0);
    assert.equal(s.nextToComplete, null);
    assert.ok(Number.isFinite(s.projectedValueCents));
  });

  test("projected value matches the end of the forecast", () => {
    const s = portfolioSummary([a, b], [], NOW);
    const f = portfolioForecast([a, b], [], NOW);
    assert.equal(s.projectedValueCents, f.months[f.months.length - 1].valueCents);
  });
});

/* ── Timezone ────────────────────────────────────────────────────────────── */

describe("timezone behaviour", () => {
  test("projections report the local calendar date at any hour", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly",
    });
    for (const hour of [0, 6, 9, 12, 18, 23]) {
      const p = projectionFor(g, [], new Date(2026, 8, 12, hour, 30));
      assert.equal(p.kind === "projected" && p.date, "2027-07-12",
        `expected the same date at ${hour}:30`);
    }
  });

  test("forecast month dates round trip as date-only values", () => {
    const g = makeGoal({ contributionCents: 100_00 });
    const f = portfolioForecast([g], [], new Date(2026, 8, 12, 7, 30), 6);
    for (const m of f.months) {
      assert.equal(toISODate(parseDate(m.date)), m.date);
    }
  });

  test("required rate is unaffected by the time of day", () => {
    const g = makeGoal({ targetCents: 1200_00, openingBalanceCents: 0, contributionCents: 0 });
    const early = requiredRate(g, [], "2027-09-12", new Date(2026, 8, 12, 6, 0));
    const late = requiredRate(g, [], "2027-09-12", new Date(2026, 8, 12, 22, 0));
    assert.deepEqual(early, late);
  });

  test("month-end target dates survive the walk", () => {
    const g = makeGoal({
      targetCents: 300_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly",
    });
    const p = projectionFor(g, [], new Date(2026, 0, 31, 12));
    assert.equal(p.kind === "projected" && p.date, "2026-04-30");
  });

  test("a leap day is handled", () => {
    const g = makeGoal({
      targetCents: 100_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly",
    });
    const p = projectionFor(g, [], new Date(2028, 0, 29, 12));
    assert.equal(p.kind === "projected" && p.date, "2028-02-29");
  });
});
