import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  cadenceOf,
  challengeImpact,
  challengeIneligibility,
  challengeProgress,
  eligibleGoalsForChallenge,
  featuredChallenge,
  FIFTY_TWO_WEEK_TOTAL_CENTS,
  generateSteps,
  plannedTotalCents,
  sprintDefaultCents,
  SPRINT_DAYS,
  stepDueDate,
  stepNote,
  tickBlock,
  type ChallengeSpec,
} from "../challenges";
import { monthlyRateCents, remainingCents } from "../calc";
import { catchUpCents } from "../allocate";
import {
  CHALLENGE_INELIGIBILITY_TEXT,
  CHALLENGE_TICK_BLOCK_TEXT,
  explainChallengeDeletion,
  explainChallengeIfFinished,
  explainChallengeImpact,
  explainChallengeProgress,
} from "../explain";
import { isValid, validateChallenge } from "../validate";
import { parseAmount } from "../money";
import type { Challenge, Contribution } from "../schema";
import { makeContribution, makeGoal, NOW } from "./helpers";

const total = (steps: number[]) => steps.reduce((a, b) => a + b, 0);

const makeChallenge = (over: Partial<Challenge> = {}): Challenge => ({
  id: "c1",
  goalId: "g1",
  type: "52-week",
  name: "52 Week Challenge",
  stepCents: generateSteps({ type: "52-week" }),
  cadence: "weekly",
  startDate: "2026-09-12",
  createdAt: "2026-09-12T00:00:00.000Z",
  archivedAt: null,
  ...over,
});

/** A contribution as a ticked step would record it. */
const tick = (
  challenge: Challenge,
  step: number,
  over: Partial<Contribution> = {},
): Contribution =>
  makeContribution(challenge.goalId, challenge.stepCents[step], "2026-09-12", {
    note: stepNote(challenge, step),
    source: { challengeId: challenge.id, step },
    ...over,
  });

/* ── Generation ──────────────────────────────────────────────────────────── */

describe("challenge generation", () => {
  test("the 52 week challenge climbs $1 to $52 and totals $1,378", () => {
    const steps = generateSteps({ type: "52-week" });
    assert.equal(steps.length, 52);
    assert.equal(steps[0], 1_00);
    assert.equal(steps[51], 52_00);
    assert.equal(total(steps), FIFTY_TWO_WEEK_TOTAL_CENTS);
    assert.equal(total(steps), 1378_00);
  });

  test("the reverse challenge falls $52 to $1 and totals the same $1,378", () => {
    const steps = generateSteps({ type: "reverse-52" });
    assert.equal(steps.length, 52);
    assert.equal(steps[0], 52_00);
    assert.equal(steps[51], 1_00);
    assert.equal(total(steps), 1378_00);
  });

  test("the reverse challenge is the 52 week challenge backwards", () => {
    assert.deepEqual(
      generateSteps({ type: "reverse-52" }),
      [...generateSteps({ type: "52-week" })].reverse(),
    );
  });

  test("a custom weekly plan totals its target exactly", () => {
    const spec: ChallengeSpec = { type: "custom-weekly", targetCents: 2000_00, weeks: 20 };
    const steps = generateSteps(spec);
    assert.equal(steps.length, 20);
    assert.equal(total(steps), 2000_00);
    assert.ok(steps.every((c) => c === 100_00));
  });

  test("cents that will not divide are shared, never lost or invented", () => {
    for (const [targetCents, weeks] of [
      [100_00, 3],
      [1_00, 7],
      [999_99, 13],
      [50_05, 11],
      [7_77, 52],
    ] as const) {
      const steps = generateSteps({ type: "custom-weekly", targetCents, weeks });
      assert.equal(steps.length, weeks);
      assert.equal(total(steps), targetCents, `${targetCents} over ${weeks} weeks`);
      assert.ok(steps.every(Number.isInteger), "every step is whole cents");
      // The split never varies by more than one cent between steps.
      assert.ok(Math.max(...steps) - Math.min(...steps) <= 1);
    }
  });

  test("a sprint splits its target across 30 days, to the cent", () => {
    const steps = generateSteps({ type: "goal-sprint", targetCents: 431_11, days: SPRINT_DAYS });
    assert.equal(steps.length, 30);
    assert.equal(total(steps), 431_11);
  });

  test("generation is deterministic", () => {
    const spec: ChallengeSpec = { type: "custom-weekly", targetCents: 1234_57, weeks: 17 };
    assert.deepEqual(generateSteps(spec), generateSteps(spec));
  });

  test("a sprint steps daily, everything else weekly", () => {
    assert.equal(cadenceOf("goal-sprint"), "daily");
    assert.equal(cadenceOf("52-week"), "weekly");
    assert.equal(cadenceOf("reverse-52"), "weekly");
    assert.equal(cadenceOf("custom-weekly"), "weekly");
  });
});

/* ── Step dates ──────────────────────────────────────────────────────────── */

describe("step due dates", () => {
  test("weekly steps fall seven days apart", () => {
    const c = makeChallenge({ startDate: "2026-09-12" });
    assert.equal(stepDueDate(c, 0), "2026-09-12");
    assert.equal(stepDueDate(c, 1), "2026-09-19");
    assert.equal(stepDueDate(c, 51), "2027-09-04");
  });

  test("daily steps fall a day apart", () => {
    const c = makeChallenge({ cadence: "daily", startDate: "2026-09-12" });
    assert.equal(stepDueDate(c, 29), "2026-10-11");
  });

  test("dates survive the day a clock changes", () => {
    // Australia's DST starts 4 Oct 2026; a midnight-anchored date would slip.
    assert.equal(addDays("2026-10-03", 1), "2026-10-04");
    assert.equal(addDays("2026-10-04", 1), "2026-10-05");
    assert.equal(addDays("2026-04-04", 1), "2026-04-05");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  });
});

/* ── Progress, read from the ledger ──────────────────────────────────────── */

describe("challenge progress", () => {
  test("nothing ticked reads as nothing saved", () => {
    const c = makeChallenge();
    const p = challengeProgress(c, []);
    assert.equal(p.stepsDone, 0);
    assert.equal(p.savedCents, 0);
    assert.equal(p.totalSteps, 52);
    assert.equal(p.plannedCents, 1378_00);
    assert.equal(p.remainingCents, 1378_00);
    assert.equal(p.complete, false);
    assert.equal(p.nextStep, 0);
  });

  test("saved is the sum of the linked contributions", () => {
    const c = makeChallenge();
    const p = challengeProgress(c, [tick(c, 0), tick(c, 1), tick(c, 4)]);
    assert.equal(p.stepsDone, 3);
    assert.equal(p.savedCents, 1_00 + 2_00 + 5_00);
    assert.equal(p.nextStep, 2);
  });

  test("contributions belonging to another challenge are ignored", () => {
    const c = makeChallenge();
    const other = makeChallenge({ id: "c2" });
    const p = challengeProgress(c, [tick(c, 0), tick(other, 9)]);
    assert.equal(p.stepsDone, 1);
    assert.equal(p.savedCents, 1_00);
  });

  test("a contribution with no source never counts towards a challenge", () => {
    const c = makeChallenge();
    const p = challengeProgress(c, [makeContribution("g1", 1_00, "2026-09-12")]);
    assert.equal(p.stepsDone, 0);
    assert.equal(p.savedCents, 0);
  });

  test("an edited row reports what was actually saved, not what was planned", () => {
    const c = makeChallenge();
    const edited = tick(c, 3);
    edited.amountCents = 10_00; // the plan asked for $4
    const p = challengeProgress(c, [edited]);
    assert.equal(p.savedCents, 10_00);
    assert.deepEqual(p.adjustedSteps, [3]);
  });

  test("every step ticked reads as complete", () => {
    const c = makeChallenge({
      stepCents: generateSteps({ type: "custom-weekly", targetCents: 300_00, weeks: 3 }),
    });
    const p = challengeProgress(c, [tick(c, 0), tick(c, 1), tick(c, 2)]);
    assert.equal(p.complete, true);
    assert.equal(p.nextStep, null);
    assert.equal(p.savedCents, 300_00);
    assert.equal(p.remainingCents, 0);
  });

  test("planned total is the sum of the schedule", () => {
    assert.equal(plannedTotalCents(makeChallenge()), 1378_00);
  });
});

/* ── Eligibility ─────────────────────────────────────────────────────────── */

describe("which goals can take a challenge", () => {
  test("a live, unfinished, targeted goal can", () => {
    const goal = makeGoal({ targetCents: 1000_00 });
    assert.equal(challengeIneligibility(goal, [], []), null);
  });

  test("an archived goal cannot", () => {
    const goal = makeGoal({ archivedAt: "2026-09-01T00:00:00.000Z" });
    assert.equal(challengeIneligibility(goal, [], []), "archived");
  });

  test("a fully funded goal cannot", () => {
    const goal = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(challengeIneligibility(goal, [], []), "complete");
  });

  test("a goal with no target cannot", () => {
    const goal = makeGoal({ targetCents: 0 });
    assert.equal(challengeIneligibility(goal, [], []), "no-target");
  });

  test("a goal already running a challenge cannot take a second", () => {
    const goal = makeGoal({ targetCents: 1000_00 });
    const running = makeChallenge({ goalId: goal.id });
    assert.equal(challengeIneligibility(goal, [], [running]), "has-challenge");
  });

  test("an archived challenge does not block a new one", () => {
    const goal = makeGoal({ targetCents: 1000_00 });
    const done = makeChallenge({ goalId: goal.id, archivedAt: "2026-09-01T00:00:00.000Z" });
    assert.equal(challengeIneligibility(goal, [], [done]), null);
  });

  test("the eligible list drops every goal that cannot take one", () => {
    const ok = makeGoal({ targetCents: 1000_00 });
    const funded = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    const archived = makeGoal({ archivedAt: "2026-09-01T00:00:00.000Z" });
    const eligible = eligibleGoalsForChallenge([ok, funded, archived], [], []);
    assert.deepEqual(eligible.map((g) => g.id), [ok.id]);
  });
});

/* ── When ticking pauses ─────────────────────────────────────────────────── */

describe("when the next step cannot be ticked", () => {
  test("a running challenge on a live, unfinished goal is tickable", () => {
    const goal = makeGoal({ targetCents: 1000_00 });
    assert.equal(tickBlock(makeChallenge({ goalId: goal.id }), goal, []), null);
  });

  test("a funded goal pauses the challenge", () => {
    const goal = makeGoal({ targetCents: 100_00, openingBalanceCents: 100_00 });
    assert.equal(tickBlock(makeChallenge({ goalId: goal.id }), goal, []), "goal-funded");
  });

  test("an archived goal pauses the challenge", () => {
    const goal = makeGoal({ targetCents: 1000_00, archivedAt: "2026-09-01T00:00:00.000Z" });
    assert.equal(tickBlock(makeChallenge({ goalId: goal.id }), goal, []), "goal-archived");
  });

  test("an archived challenge is not tickable", () => {
    const goal = makeGoal({ targetCents: 1000_00 });
    const c = makeChallenge({ goalId: goal.id, archivedAt: "2026-09-05T00:00:00.000Z" });
    assert.equal(tickBlock(c, goal, []), "challenge-archived");
  });

  test("a missing goal is reported rather than crashed on", () => {
    assert.equal(tickBlock(makeChallenge(), undefined, []), "goal-missing");
  });
});

/* ── Effect on the goal ──────────────────────────────────────────────────── */

describe("what a challenge does to its goal", () => {
  test("money in brings the finish date forward", () => {
    const goal = makeGoal({
      id: "g1",
      targetCents: 5000_00,
      openingBalanceCents: 0,
      contributionCents: 100_00,
      frequency: "monthly",
    });
    const c = makeChallenge({ goalId: goal.id });
    const ticked = [tick(c, 51), tick(c, 50)]; // $52 + $51
    const impact = challengeImpact(c, goal, ticked, NOW);

    assert.equal(impact.savedCents, 103_00);
    assert.equal(impact.before.kind, "projected");
    assert.equal(impact.after.kind, "projected");
    assert.ok(impact.monthsSaved !== null && impact.monthsSaved >= 1);
  });

  test("the baseline is the goal without a cent of this challenge", () => {
    const goal = makeGoal({ targetCents: 1000_00, contributionCents: 100_00 });
    const c = makeChallenge({ goalId: goal.id });
    const unrelated = makeContribution(goal.id, 500_00, "2026-09-01");
    const impact = challengeImpact(c, goal, [unrelated, tick(c, 0)], NOW);

    // The unrelated $500 belongs in both sides; only the challenge's $1 differs.
    assert.equal(impact.before.kind, "projected");
    assert.equal(impact.after.kind, "projected");
    assert.equal(impact.savedCents, 1_00);
  });

  test("a goal with no contribution set reports no month change rather than a guess", () => {
    const goal = makeGoal({ targetCents: 1000_00, contributionCents: 0 });
    const c = makeChallenge({ goalId: goal.id });
    const impact = challengeImpact(c, goal, [tick(c, 0)], NOW);
    assert.equal(impact.before.kind, "unable");
    assert.equal(impact.monthsSaved, null);
  });

  test("finishing the rest is modelled, not promised", () => {
    const goal = makeGoal({ targetCents: 2000_00, contributionCents: 100_00 });
    const c = makeChallenge({ goalId: goal.id });
    const impact = challengeImpact(c, goal, [tick(c, 0)], NOW);
    assert.equal(impact.remainingCents, 1378_00 - 1_00);
    assert.ok(impact.ifFinishedExtraMonths !== null && impact.ifFinishedExtraMonths > 0);
  });

  test("a challenge that funds the goal outright says so", () => {
    const goal = makeGoal({
      targetCents: 100_00,
      openingBalanceCents: 0,
      contributionCents: 10_00,
    });
    const c = makeChallenge({
      goalId: goal.id,
      stepCents: generateSteps({ type: "custom-weekly", targetCents: 100_00, weeks: 2 }),
    });
    const impact = challengeImpact(c, goal, [tick(c, 0), tick(c, 1)], NOW);
    assert.equal(impact.after.kind, "complete");
    assert.equal(impact.remainingCents, 0);
  });

  test("months saved never reads as negative", () => {
    const goal = makeGoal({ targetCents: 1000_00, contributionCents: 100_00 });
    const c = makeChallenge({ goalId: goal.id });
    const impact = challengeImpact(c, goal, [], NOW);
    assert.equal(impact.monthsSaved, 0);
  });
});

/* ── The sprint suggestion ───────────────────────────────────────────────── */

describe("the suggested sprint target", () => {
  test("an on-track goal is offered one month of its own plan", () => {
    const goal = makeGoal({
      targetCents: 10_000_00,
      openingBalanceCents: 5_000_00,
      contributionCents: 500_00,
      frequency: "monthly",
      targetDate: "2030-09-12",
    });
    assert.equal(catchUpCents(goal, [], NOW), 0);
    assert.equal(sprintDefaultCents(goal, [], NOW), 500_00);
  });

  test("a behind goal is offered a month of plan plus at most a month of catch-up", () => {
    const goal = makeGoal({
      targetCents: 10_000_00,
      openingBalanceCents: 0,
      contributionCents: 100_00,
      frequency: "monthly",
      targetDate: "2027-09-12", // far short at $100 a month
    });
    const monthly = monthlyRateCents(goal);
    assert.ok(catchUpCents(goal, [], NOW) > monthly, "this goal is badly behind");
    // Never the whole shortfall — capped at one further month.
    assert.equal(sprintDefaultCents(goal, [], NOW), monthly * 2);
  });

  test("the suggestion never exceeds what the goal still needs", () => {
    const goal = makeGoal({
      targetCents: 1000_00,
      openingBalanceCents: 950_00,
      contributionCents: 400_00,
      frequency: "monthly",
      targetDate: "2026-10-12",
    });
    assert.equal(sprintDefaultCents(goal, [], NOW), remainingCents(goal, []));
    assert.equal(sprintDefaultCents(goal, [], NOW), 50_00);
  });

  test("a goal with no planned rate gets no invented number", () => {
    const goal = makeGoal({ targetCents: 1000_00, contributionCents: 0 });
    assert.equal(sprintDefaultCents(goal, [], NOW), null);
  });

  test("weekly plans convert at 52 a year before the suggestion is made", () => {
    // Comfortably on track, so the suggestion is exactly one month of plan.
    const weekly = makeGoal({
      targetCents: 100_000_00,
      contributionCents: 100_00,
      frequency: "weekly",
      targetDate: "2060-09-12",
    });
    assert.equal(catchUpCents(weekly, [], NOW), 0);
    assert.equal(monthlyRateCents(weekly), Math.round(100_00 * (52 / 12)));
    assert.equal(sprintDefaultCents(weekly, [], NOW), monthlyRateCents(weekly));
  });
});

/* ── Picking one for the dashboard ───────────────────────────────────────── */

describe("the featured challenge", () => {
  test("nothing active means nothing to feature", () => {
    assert.equal(featuredChallenge([], []), null);
    const archived = makeChallenge({ archivedAt: "2026-09-01T00:00:00.000Z" });
    assert.equal(featuredChallenge([archived], []), null);
  });

  test("the oldest active challenge with steps left is featured", () => {
    const older = makeChallenge({
      id: "c-old",
      createdAt: "2026-01-01T00:00:00.000Z",
      stepCents: [1_00],
    });
    const newer = makeChallenge({ id: "c-new", createdAt: "2026-06-01T00:00:00.000Z" });
    assert.equal(featuredChallenge([newer, older], [])?.id, "c-old");

    // Once the older one is finished, the unfinished one takes its place.
    const finished = [tick(older, 0)];
    assert.equal(featuredChallenge([newer, older], finished)?.id, "c-new");
  });

  test("the choice does not depend on the order it is given", () => {
    const a = makeChallenge({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" });
    const b = makeChallenge({ id: "b", createdAt: "2026-01-01T00:00:00.000Z" });
    assert.equal(featuredChallenge([a, b], [])?.id, featuredChallenge([b, a], [])?.id);
  });
});

/* ── What the customer is told ───────────────────────────────────────────── */

describe("challenge explanations", () => {
  const goal = makeGoal({
    id: "g1",
    name: "Japan Trip",
    targetCents: 5000_00,
    contributionCents: 100_00,
    frequency: "monthly",
  });

  const impactAfter = (steps: number[]) => {
    const c = makeChallenge({ goalId: goal.id });
    return challengeImpact(c, goal, steps.map((s) => tick(c, s)), NOW);
  };

  test("nothing ticked invites a first step rather than claiming a result", () => {
    const text = explainChallengeImpact(impactAfter([]), goal.name);
    assert.match(text, /first step/i);
  });

  test("a real shift is stated in the months the forecast actually has", () => {
    const text = explainChallengeImpact(impactAfter([51, 50, 49, 48]), goal.name);
    assert.match(text, /moved Japan Trip .* closer/);
    assert.match(text, /months?|years?/);
  });

  test("no explanation manufactures week precision from a monthly forecast", () => {
    for (const steps of [[], [0], [0, 1, 2], [51, 50, 49, 48], [51, 50, 49, 48, 47, 46]]) {
      const impact = impactAfter(steps);
      for (const text of [
        explainChallengeImpact(impact, goal.name),
        explainChallengeIfFinished(impact, goal.name) ?? "",
      ]) {
        assert.doesNotMatch(text, /\bweeks?\b/i, text);
        assert.doesNotMatch(text, /\bdays?\b/i, text);
        assert.doesNotMatch(text, /\bfortnights?\b/i, text);
      }
    }
  });

  test("money saved but no full month moved says exactly that", () => {
    const text = explainChallengeImpact(impactAfter([0]), goal.name);
    assert.match(text, /hasn't moved/i);
    assert.match(text, /\$1\b/);
  });

  test("an unprojectable goal gets a simpler truthful result, not a guess", () => {
    const stalled = makeGoal({ name: "Someday", targetCents: 1000_00, contributionCents: 0 });
    const c = makeChallenge({ goalId: stalled.id });
    const impact = challengeImpact(c, stalled, [tick(c, 0)], NOW);
    const text = explainChallengeImpact(impact, stalled.name);
    assert.match(text, /\$1\b/);
    assert.match(text, /regular contribution/i);
  });

  test("a finished goal is described as finished", () => {
    const small = makeGoal({ name: "Camera", targetCents: 3_00, contributionCents: 10_00 });
    const c = makeChallenge({ goalId: small.id });
    const impact = challengeImpact(c, small, [tick(c, 0), tick(c, 1)], NOW);
    const text = explainChallengeImpact(impact, small.name);
    assert.match(text, /fully funded/i);
  });

  test("finishing the rest is offered only while there is a rest", () => {
    assert.equal(explainChallengeIfFinished(impactAfter([]), goal.name)?.includes("$"), true);
    const small = makeGoal({ name: "Camera", targetCents: 3_00, contributionCents: 10_00 });
    const c = makeChallenge({
      goalId: small.id,
      stepCents: generateSteps({ type: "custom-weekly", targetCents: 3_00, weeks: 2 }),
    });
    const done = challengeImpact(c, small, [tick(c, 0), tick(c, 1)], NOW);
    assert.equal(explainChallengeIfFinished(done, small.name), null);
  });

  test("progress is counted in the challenge's own unit", () => {
    const c = makeChallenge();
    const weekly = explainChallengeProgress(challengeProgress(c, [tick(c, 0)]), "weekly");
    assert.equal(weekly, "1 of 52 weeks ticked · $1 saved");

    const sprint = makeChallenge({
      cadence: "daily",
      stepCents: generateSteps({ type: "goal-sprint", targetCents: 300_00, days: 30 }),
    });
    const daily = explainChallengeProgress(challengeProgress(sprint, []), "daily");
    assert.equal(daily, "0 of 30 days ticked · $0 saved");
  });

  test("deleting names the money it would take", () => {
    assert.match(explainChallengeDeletion(412_00, "Japan Trip"), /\$412.*Japan Trip/);
    assert.match(explainChallengeDeletion(412_00, "Japan Trip"), /archive/i);
    assert.match(explainChallengeDeletion(0, "Japan Trip"), /hasn't recorded any money/i);
  });

  test("a paused challenge explains itself without scolding", () => {
    assert.match(CHALLENGE_TICK_BLOCK_TEXT["goal-funded"], /fully funded/i);
    assert.match(CHALLENGE_TICK_BLOCK_TEXT["goal-funded"], /nothing you've saved is lost/i);
    assert.match(CHALLENGE_TICK_BLOCK_TEXT["goal-archived"], /restore the goal/i);
  });

  test("no explanation exposes a score, weight or factor", () => {
    const texts = [
      explainChallengeImpact(impactAfter([51, 50]), goal.name),
      explainChallengeIfFinished(impactAfter([51, 50]), goal.name) ?? "",
      explainChallengeProgress(challengeProgress(makeChallenge(), []), "weekly"),
      ...Object.values(CHALLENGE_TICK_BLOCK_TEXT),
      ...Object.values(CHALLENGE_INELIGIBILITY_TEXT),
    ];
    for (const text of texts) {
      assert.doesNotMatch(text, /score|weight|factor|multiplier|algorithm/i, text);
    }
  });
});

/* ── Creating one ────────────────────────────────────────────────────────── */

describe("validating a new challenge", () => {
  const base = {
    type: "52-week" as const,
    goalId: "g1",
    name: "52 Week Challenge",
    target: "",
    weeks: "",
    startDate: "2026-09-12",
  };

  test("a fixed challenge needs only a goal, a name and a start date", () => {
    assert.ok(isValid(validateChallenge(base, NOW)));
  });

  test("a goal must be chosen", () => {
    assert.ok(validateChallenge({ ...base, goalId: "" }, NOW).goalId);
  });

  test("a name is required and bounded", () => {
    assert.ok(validateChallenge({ ...base, name: "   " }, NOW).name);
    assert.ok(validateChallenge({ ...base, name: "x".repeat(61) }, NOW).name);
  });

  test("the start date must be a real date", () => {
    assert.ok(validateChallenge({ ...base, startDate: "" }, NOW).startDate);
    assert.ok(validateChallenge({ ...base, startDate: "12/09/2026" }, NOW).startDate);
    assert.ok(validateChallenge({ ...base, startDate: "2026-02-31" }, NOW).startDate);
    assert.ok(validateChallenge({ ...base, startDate: "2400-01-01" }, NOW).startDate);
  });

  test("a start date in the past is allowed — challenges get back-filled", () => {
    assert.ok(isValid(validateChallenge({ ...base, startDate: "2026-01-05" }, NOW)));
  });

  test("a custom weekly challenge needs a target and a week count", () => {
    const custom = { ...base, type: "custom-weekly" as const };
    assert.ok(validateChallenge(custom, NOW).target);
    assert.ok(validateChallenge({ ...custom, target: "2000" }, NOW).weeks);
    assert.ok(isValid(validateChallenge({ ...custom, target: "2000", weeks: "20" }, NOW)));
  });

  test("week counts must be whole and sensible", () => {
    const custom = { ...base, type: "custom-weekly" as const, target: "2000" };
    assert.ok(validateChallenge({ ...custom, weeks: "0" }, NOW).weeks);
    assert.ok(validateChallenge({ ...custom, weeks: "-4" }, NOW).weeks);
    assert.ok(validateChallenge({ ...custom, weeks: "4.5" }, NOW).weeks);
    assert.ok(validateChallenge({ ...custom, weeks: "300" }, NOW).weeks);
  });

  test("a target too small to give every step a cent is refused", () => {
    const custom = { ...base, type: "custom-weekly" as const };
    assert.ok(validateChallenge({ ...custom, target: "0.10", weeks: "52" }, NOW).target);
    assert.ok(isValid(validateChallenge({ ...custom, target: "0.52", weeks: "52" }, NOW)));
  });

  test("a sprint target must cover its thirty days", () => {
    const sprint = { ...base, type: "goal-sprint" as const, weeks: "" };
    assert.ok(validateChallenge({ ...sprint, target: "0.29" }, NOW).target);
    assert.ok(isValid(validateChallenge({ ...sprint, target: "0.30" }, NOW)));
    assert.ok(isValid(validateChallenge({ ...sprint, target: "500" }, NOW)));
  });

  test("a validated custom target always generates a cent-perfect schedule", () => {
    for (const [target, weeks] of [["2000", 20], ["333.33", 7], ["0.52", 52]] as const) {
      const input = { ...base, type: "custom-weekly" as const, target, weeks: String(weeks) };
      assert.ok(isValid(validateChallenge(input, NOW)));
      const cents = parseAmount(target)!;
      const steps = generateSteps({ type: "custom-weekly", targetCents: cents, weeks });
      assert.equal(total(steps), cents);
      assert.ok(steps.every((c) => c >= 1), "every step is worth at least a cent");
    }
  });
});
