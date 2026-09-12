import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { forecastSeries } from "../calc";
import { buildDemoDataset } from "../demo";
import { makeContribution, makeGoal, NOW } from "./helpers";

/**
 * The dashboard's Savings Forecast is locked. These values were captured from
 * the shipping implementation before the monthly walker was introduced; the
 * yearly series must keep returning exactly the same numbers afterwards.
 */
describe("forecastSeries golden output", () => {
  test("demo dataset series is unchanged", () => {
    const d = buildDemoDataset(NOW);
    const series = forecastSeries(d.goals, d.contributions, NOW, 4);
    assert.deepEqual(series, [
      { year: 2026, valueCents: 5497000 },
      { year: 2027, valueCents: 6839004 },
      { year: 2028, valueCents: 7798000 },
      { year: 2029, valueCents: 7942000 },
      { year: 2030, valueCents: 8086000 },
    ]);
  });

  test("a single monthly goal steps twelve times a year and caps at target", () => {
    const g = makeGoal({
      targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly",
    });
    assert.deepEqual(forecastSeries([g], [], NOW, 2), [
      { year: 2026, valueCents: 0 },
      { year: 2027, valueCents: 1000_00 },
      { year: 2028, valueCents: 1000_00 },
    ]);
  });

  test("weekly and fortnightly goals keep their converted rates", () => {
    const w = makeGoal({ targetCents: 100_000_00, openingBalanceCents: 0, contributionCents: 100_00, frequency: "weekly" });
    const f = makeGoal({ targetCents: 100_000_00, openingBalanceCents: 0, contributionCents: 100_00, frequency: "fortnightly" });
    assert.equal(forecastSeries([w], [], NOW, 1)[1].valueCents, 43333 * 12);
    assert.equal(forecastSeries([f], [], NOW, 1)[1].valueCents, 21667 * 12);
  });

  test("archived goals are excluded and contributions are counted", () => {
    const a = makeGoal({ targetCents: 500_00, openingBalanceCents: 100_00, contributionCents: 0 });
    const b = makeGoal({ targetCents: 500_00, openingBalanceCents: 0, contributionCents: 0, archivedAt: "2026-01-01T00:00:00.000Z" });
    const c = [makeContribution(a.id, 50_00, "2026-02-01")];
    assert.equal(forecastSeries([a, b], c, NOW, 1)[0].valueCents, 150_00);
  });
});
