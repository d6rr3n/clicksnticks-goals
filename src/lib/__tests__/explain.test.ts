import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  describeMonths,
  explainAgainstTarget,
  explainAllocation,
  explainPlan,
  explainUnallocated,
  explainExtra,
  explainLumpSum,
  explainProjection,
  explainRate,
  explainRequired,
  portfolioNotes,
  rateSentence,
} from "../explain";
import {
  monthsAgainstTarget,
  portfolioSummary,
  projectionFor,
  requiredRate,
  simulateExtra,
  simulateLumpSum,
} from "../forecast";
import { smartAllocate } from "../allocate";
import { monthYear } from "../dates";
import { makeGoal, NOW } from "./helpers";

const noJargon = (s: string) => {
  // Sentences the customer reads should not leak internal vocabulary.
  for (const word of ["cents", "monthlyRate", "undefined", "NaN", "Infinity", "null"]) {
    assert.ok(!s.includes(word), `"${s}" leaked "${word}"`);
  }
  assert.ok(s.length > 0);
};

describe("durations in words", () => {
  test("months, years and both", () => {
    assert.equal(describeMonths(1), "1 month");
    assert.equal(describeMonths(5), "5 months");
    assert.equal(describeMonths(12), "1 year");
    assert.equal(describeMonths(14), "1 year 2 months");
    assert.equal(describeMonths(24), "2 years");
    assert.equal(describeMonths(25), "2 years 1 month");
  });

  test("zero and negatives never produce nonsense", () => {
    assert.equal(describeMonths(0), "no time at all");
    assert.equal(describeMonths(-4), "no time at all");
  });

  test("rates read the way a person says them", () => {
    assert.equal(rateSentence(50_00, "weekly"), "$50 a week");
    assert.equal(rateSentence(50_00, "fortnightly"), "$50 a fortnight");
    assert.equal(rateSentence(50_00, "monthly"), "$50 a month");
  });
});

describe("goal projection in words", () => {
  const onTrack = makeGoal({
    name: "Japan Trip", targetCents: 1000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2027-10-12",
  });

  test("an early goal says so against its target", () => {
    const p = projectionFor(onTrack, [], NOW);
    const s = explainProjection(onTrack, p);
    // Derived, not hardcoded: en-AU spells some months out ("July", "Sept").
    assert.ok(s.includes(monthYear("2027-07-12")), s);
    assert.ok(s.includes(`ahead of your ${monthYear("2027-10-12")} target`), s);
    noJargon(s);
  });

  test("a late goal says so plainly", () => {
    const late = makeGoal({ ...onTrack, targetDate: "2027-01-12" });
    const s = explainProjection(late, projectionFor(late, [], NOW));
    assert.ok(s.includes(`after your ${monthYear("2027-01-12")} target`), s);
    noJargon(s);
  });

  test("landing in the target month reads as on target", () => {
    const exact = makeGoal({ ...onTrack, targetDate: "2027-07-31" });
    const s = explainProjection(exact, projectionFor(exact, [], NOW));
    assert.match(s, /right on target/);
  });

  test("a completed goal is not given a date", () => {
    const done = makeGoal({ name: "Emergency Fund", targetCents: 100_00, openingBalanceCents: 100_00 });
    const s = explainProjection(done, projectionFor(done, [], NOW));
    assert.match(s, /fully funded/);
    noJargon(s);
  });

  test("no contribution explains itself rather than showing nonsense", () => {
    const stalled = makeGoal({ name: "New Car", contributionCents: 0 });
    const s = explainProjection(stalled, projectionFor(stalled, [], NOW));
    assert.match(s, /no regular contribution/i);
    assert.match(s, /can't work out a completion date/);
    noJargon(s);
  });

  test("against-target line is omitted when there is no projection", () => {
    const stalled = makeGoal({ contributionCents: 0 });
    const p = projectionFor(stalled, [], NOW);
    assert.equal(explainAgainstTarget(p, monthsAgainstTarget(stalled, p)), null);
  });

  test("against-target reads early, late or on the month", () => {
    const p = projectionFor(onTrack, [], NOW);
    assert.equal(explainAgainstTarget(p, 3), "About 3 months early.");
    assert.equal(explainAgainstTarget(p, -3), "About 3 months late.");
    assert.equal(explainAgainstTarget(p, 0), "Landing in your target month.");
  });
});

describe("scenarios in words", () => {
  const goal = makeGoal({
    name: "House Deposit", targetCents: 12_000_00, openingBalanceCents: 0,
    contributionCents: 200_00, frequency: "monthly", targetDate: "2030-01-01",
  });

  test("extra saving names both dates and the gain", () => {
    const extra = { amountCents: 200_00, frequency: "monthly" as const };
    const s = explainExtra(goal, extra, simulateExtra(goal, [], extra, NOW));
    assert.match(s, /\$200 a month/);
    assert.match(s, /2 years 6 months/);
    noJargon(s);
  });

  test("an extra too small to move a whole month says so", () => {
    const extra = { amountCents: 1, frequency: "monthly" as const };
    const s = explainExtra(goal, extra, simulateExtra(goal, [], extra, NOW));
    assert.match(s, /isn't quite enough/);
    noJargon(s);
  });

  test("zero extra restates the current plan", () => {
    const extra = { amountCents: 0, frequency: "weekly" as const };
    const s = explainExtra(goal, extra, simulateExtra(goal, [], extra, NOW));
    assert.match(s, /current plan/);
  });

  test("a lump sum that finishes the goal says so outright", () => {
    const s = explainLumpSum(goal, 12_000_00, simulateLumpSum(goal, [], 12_000_00, NOW));
    assert.match(s, /finish House Deposit outright/);
    noJargon(s);
  });

  test("a partial lump sum gives months saved and a percentage", () => {
    const s = explainLumpSum(goal, 6_000_00, simulateLumpSum(goal, [], 6_000_00, NOW));
    assert.match(s, /50% complete/);
    assert.match(s, /2 years 6 months/);
    noJargon(s);
  });

  test("required rate states the shortfall", () => {
    const r = requiredRate(goal, [], "2027-09-12", NOW);
    const s = explainRequired(goal, "2027-09-12", r, "weekly");
    assert.match(s, /a week/);
    assert.match(s, /more than you're saving now/);
    noJargon(s);
  });

  test("required rate congratulates when the plan already suffices", () => {
    const r = requiredRate(goal, [], "2035-01-01", NOW);
    const s = explainRequired(goal, "2035-01-01", r, "monthly");
    assert.match(s, /already saving enough/);
  });

  test("an impossible date is explained, not calculated", () => {
    const past = explainRequired(goal, "2020-01-01", requiredRate(goal, [], "2020-01-01", NOW), "weekly");
    assert.match(past, /already passed/);
    const soon = explainRequired(goal, "2026-09-30", requiredRate(goal, [], "2026-09-30", NOW), "weekly");
    assert.match(soon, /less than a month away/);
    noJargon(past);
    noJargon(soon);
  });
});

describe("portfolio notes", () => {
  const near = makeGoal({
    id: "a", name: "Japan Trip", targetCents: 1000_00, openingBalanceCents: 0,
    contributionCents: 500_00, frequency: "monthly", targetDate: "2028-01-01",
  });
  const far = makeGoal({
    id: "b", name: "House Deposit", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2032-01-01",
  });

  test("names the next goal to land first", () => {
    const notes = portfolioNotes(portfolioSummary([near, far], [], NOW));
    assert.match(notes[0], /Japan Trip is your next goal to land/);
    notes.forEach(noJargon);
  });

  test("mentions goals that cannot be projected", () => {
    const stalled = makeGoal({ id: "s", name: "New Car", contributionCents: 0 });
    const notes = portfolioNotes(portfolioSummary([near, stalled], [], NOW), 5);
    assert.ok(notes.some((n) => /no regular contribution set/.test(n)));
  });

  test("mentions goals finishing after their target", () => {
    const late = makeGoal({
      id: "l", name: "New Car", targetCents: 90_000_00, openingBalanceCents: 0,
      contributionCents: 100_00, frequency: "monthly", targetDate: "2027-01-01",
    });
    const notes = portfolioNotes(portfolioSummary([near, late], [], NOW), 5);
    assert.ok(notes.some((n) => /after (its|their) target/.test(n)));
  });

  test("an empty portfolio gets one useful line", () => {
    assert.deepEqual(portfolioNotes(portfolioSummary([], [], NOW)), [
      "Add a goal and your forecast will appear here.",
    ]);
  });

  test("notes are capped so the page never lectures", () => {
    assert.ok(portfolioNotes(portfolioSummary([near, far], [], NOW), 2).length <= 2);
  });

  test("the combined rate is stated in plain words", () => {
    const s = explainRate(portfolioSummary([near, far], [], NOW));
    assert.match(s, /a week/);
    noJargon(s);
    assert.match(explainRate(portfolioSummary([], [], NOW)), /No regular saving/);
  });
});

describe("smart allocation in words", () => {
  const behind = makeGoal({
    id: "behind", name: "New Car", targetCents: 20_000_00, openingBalanceCents: 0,
    contributionCents: 100_00, frequency: "monthly", targetDate: "2028-09-12",
  });
  const onTrack = makeGoal({
    id: "ontrack", name: "Japan Trip", targetCents: 5000_00, openingBalanceCents: 0,
    contributionCents: 500_00, frequency: "monthly", targetDate: "2027-06-12",
  });
  const done = makeGoal({
    id: "done", name: "Emergency Fund", targetCents: 100_00, openingBalanceCents: 100_00,
  });

  const reasonFor = (plan: ReturnType<typeof smartAllocate>, id: string) =>
    explainAllocation(plan.allocations.find((a) => a.goalId === id)!);

  test("a behind goal is described as behind, never as a score", () => {
    const plan = smartAllocate([behind, onTrack], [], 1000_00, NOW);
    const s = reasonFor(plan, "behind");
    assert.match(s, /[Bb]ehind schedule/);
    noJargon(s);
    assert.ok(!/\d+\s*(points|score|weight)/i.test(s), s);
  });

  test("a completed goal says it is already funded", () => {
    const plan = smartAllocate([behind, done], [], 1000_00, NOW);
    assert.match(reasonFor(plan, "done"), /[Aa]lready fully funded/);
  });

  test("an archived goal explains its exclusion", () => {
    const archived = makeGoal({ id: "arch", name: "Old", archivedAt: "2026-01-01T00:00:00.000Z" });
    const plan = smartAllocate([behind, archived], [], 1000_00, NOW);
    assert.match(reasonFor(plan, "arch"), /[Aa]rchived goals aren't included/);
  });

  test("a goal with no target explains that too", () => {
    const noTarget = makeGoal({ id: "nt", name: "Someday", targetCents: 0 });
    const plan = smartAllocate([behind, noTarget], [], 1000_00, NOW);
    assert.match(reasonFor(plan, "nt"), /[Nn]o target amount/);
  });

  test("an allocation that finishes a goal says so", () => {
    const plan = smartAllocate([onTrack], [], 9000_00, NOW);
    assert.match(reasonFor(plan, "ontrack"), /finishes Japan Trip outright/);
  });

  test("the plan headline states what it does", () => {
    const plan = smartAllocate([behind, onTrack], [], 1000_00, NOW);
    const s = explainPlan(plan);
    assert.match(s, /Here's one way to spread \$1,000/);
    noJargon(s);
  });

  test("nothing to allocate is explained, not blank", () => {
    assert.match(explainPlan(smartAllocate([done], [], 1000_00, NOW)), /nowhere to put this/);
    assert.match(explainPlan(smartAllocate([behind], [], 0, NOW)), /Enter an amount/);
  });

  test("leftover money is stated plainly", () => {
    const plan = smartAllocate([onTrack], [], 99_000_00, NOW);
    const s = explainUnallocated(plan);
    assert.ok(s && /left over/.test(s), String(s));
    noJargon(s!);
    assert.equal(explainUnallocated(smartAllocate([behind], [], 100_00, NOW)), null);
  });

  test("no explanation leaks the internal weighting", () => {
    const plan = smartAllocate([behind, onTrack, done], [], 1000_00, NOW);
    for (const a of plan.allocations) {
      const s = explainAllocation(a);
      noJargon(s);
      assert.ok(!/weight|score|factor|multiplier/i.test(s), `"${s}" exposed the maths`);
    }
  });
});

describe("why a goal got a share of this particular plan", () => {
  const catchUp = makeGoal({
    id: "car", name: "New Car", targetCents: 25_000_00, openingBalanceCents: 8_100_00,
    contributionCents: 120_00, frequency: "monthly", targetDate: "2028-01-12",
    priority: "low",
  });
  const priority = makeGoal({
    id: "house", name: "House Deposit", targetCents: 50_000_00, openingBalanceCents: 31_450_00,
    contributionCents: 200_00, frequency: "weekly", targetDate: "2028-08-12",
    priority: "high",
  });
  const second = makeGoal({
    id: "boat", name: "Boat", targetCents: 40_000_00, openingBalanceCents: 0,
    contributionCents: 50_00, frequency: "monthly", targetDate: "2027-06-12",
    priority: "low",
  });

  const reasonFor = (goals: typeof catchUp[], id: string) => {
    const plan = smartAllocate(goals, [], 1000_00, NOW);
    return explainAllocation(plan.allocations.find((a) => a.goalId === id)!, plan);
  };

  test("names the goal that is actually catching up", () => {
    const s = reasonFor([priority, catchUp], "house");
    assert.match(s, /high-priority goal/);
    assert.match(s, /while New Car catches up/);
    noJargon(s);
  });

  test("the named goal is derived, never hardcoded", () => {
    const renamed = makeGoal({ ...catchUp, id: "car", name: "Camper Van" });
    const s = reasonFor([priority, renamed], "house");
    assert.match(s, /while Camper Van catches up/);
    assert.ok(!s.includes("New Car"), s);
  });

  test("generalises when more than one goal is catching up", () => {
    const s = reasonFor([priority, catchUp, second], "house");
    assert.match(s, /while your behind-schedule goals catch up/);
    assert.ok(!/New Car|Boat/.test(s), s);
    noJargon(s);
  });

  test("falls back sensibly when nothing is behind", () => {
    const comfortable = makeGoal({
      id: "easy", name: "Easy", targetCents: 1000_00, openingBalanceCents: 0,
      contributionCents: 900_00, frequency: "monthly", targetDate: "2030-01-12",
      priority: "medium",
    });
    const plan = smartAllocate([priority, comfortable], [], 1000_00, NOW);
    const a = plan.allocations.find((x) => x.goalId === "house")!;
    if (a.reason === "high-priority") {
      const s = explainAllocation(a, plan);
      assert.match(s, /larger share of what's available/);
      assert.ok(!/catches up|catch up/.test(s), s);
      noJargon(s);
    }
  });

  test("a goal never says it is waiting for itself", () => {
    const plan = smartAllocate([priority, catchUp], [], 1000_00, NOW);
    for (const a of plan.allocations) {
      const s = explainAllocation(a, plan);
      assert.ok(!s.includes(`while ${a.name} catches up`), `${a.name}: ${s}`);
    }
  });

  test("without the plan it still reads sensibly", () => {
    const plan = smartAllocate([priority, catchUp], [], 1000_00, NOW);
    const a = plan.allocations.find((x) => x.goalId === "house")!;
    const s = explainAllocation(a);
    noJargon(s);
    assert.ok(s.length > 0);
  });
});
