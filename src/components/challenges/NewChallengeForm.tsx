"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, dateInputClass, inputClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import { newId } from "@/lib/store/mutations";
import {
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_LABEL,
  type ChallengeType,
} from "@/lib/schema";
import {
  SPRINT_DAYS,
  addDays,
  challengeIneligibility,
  defaultChallengeName,
  eligibleGoalsForChallenge,
  generateSteps,
  sprintDefaultCents,
  type ChallengeSpec,
} from "@/lib/challenges";
import { CHALLENGE_INELIGIBILITY_TEXT } from "@/lib/explain";
import { money, moneyExact, parseAmount, toDollars } from "@/lib/money";
import { fullDate, toISODate } from "@/lib/dates";
import {
  isValid,
  validateChallenge,
  type ChallengeField,
  type Errors,
} from "@/lib/validate";

const BLURB: Record<ChallengeType, string> = {
  "52-week":
    "$1 in week one, $2 in week two, on to $52 in week fifty-two. $1,378 over a year, starting gently.",
  "reverse-52":
    "$52 first, $1 last. The same $1,378, with the hardest weeks behind you early.",
  "custom-weekly":
    "Pick what you want to save and how long you have. We'll split it evenly, to the cent.",
  "goal-sprint":
    "Thirty days, a small amount each day, aimed at one goal that could use a push.",
};

/**
 * Creating a challenge. The schedule is shown in full before anything is
 * saved — how many steps, what they add up to, when the last one falls — so
 * nobody signs up to a number they haven't seen.
 */
export function NewChallengeForm() {
  const router = useRouter();
  const { data, addChallenge } = useGoals();
  const now = useNow();

  const [type, setType] = useState<ChallengeType>("52-week");
  const [goalId, setGoalId] = useState("");
  const [name, setName] = useState<string | null>(null);
  /** Null means "use the suggestion"; a string means the customer typed it. */
  const [target, setTarget] = useState<string | null>(null);
  const [weeks, setWeeks] = useState("20");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors<ChallengeField>>({});

  const eligible = eligibleGoalsForChallenge(data.goals, data.contributions, data.challenges);
  const ineligible = data.goals
    .map((goal) => ({
      goal,
      reason: challengeIneligibility(goal, data.contributions, data.challenges),
    }))
    .filter((row) => row.reason !== null);

  const goal = eligible.find((g) => g.id === goalId);
  const suggested =
    type === "goal-sprint" && goal
      ? sprintDefaultCents(goal, data.contributions, now)
      : null;

  const effectiveName = name ?? defaultChallengeName(type);
  const effectiveStart = startDate ?? toISODate(now);
  const effectiveTarget =
    target ?? (suggested !== null ? String(toDollars(suggested)) : "");

  const input = {
    type,
    goalId,
    name: effectiveName,
    target: effectiveTarget,
    weeks,
    startDate: effectiveStart,
  };

  const customisable = type === "custom-weekly" || type === "goal-sprint";
  const targetCents = parseAmount(effectiveTarget);
  const weekCount = Number(weeks);

  // Only previewed once the numbers behind it are sound.
  const preview = isValid(validateChallenge(input, now))
    ? generateSteps(specFor(type, targetCents, weekCount))
    : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateChallenge(input, now);
    setErrors(found);
    if (!isValid(found)) return;

    const id = newId();
    addChallenge({
      id,
      goalId,
      name: effectiveName.trim(),
      spec: specFor(type, targetCents, weekCount),
      startDate: effectiveStart,
    });
    router.push(`/challenges/${id}`);
  }

  if (eligible.length === 0) {
    return (
      <Panel title="No goal is ready for a challenge">
        <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
          A challenge saves towards one real goal, so there has to be a goal
          waiting for it — live, not yet fully funded, and not already running a
          challenge of its own.
        </p>
        {ineligible.length > 0 && <IneligibleList rows={ineligible} />}
      </Panel>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Panel title="Pick a challenge">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Challenge type</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CHALLENGE_TYPES.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-card border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-secondary ${
                  type === option
                    ? "border-secondary bg-tint-soft/40"
                    : "border-border bg-surface hover:border-secondary"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="challenge-type"
                    value={option}
                    checked={type === option}
                    onChange={() => {
                      setType(option);
                      setTarget(null);
                    }}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-[14.5px] font-medium">
                    {CHALLENGE_TYPE_LABEL[option]}
                  </span>
                </span>
                <span className="pl-[26px] text-[12px] leading-relaxed text-muted">
                  {BLURB[option]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <Panel title="Set it up">
        <div className="flex flex-col gap-4">
          <Field label="Saving towards" error={errors.goalId}>
            {(props) => (
              <select
                {...props}
                value={goalId}
                onChange={(e) => {
                  setGoalId(e.target.value);
                  setTarget(null);
                }}
                className={inputClass(Boolean(errors.goalId))}
              >
                <option value="">Choose a goal…</option>
                {eligible.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji ? `${g.emoji} ` : ""}
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {ineligible.length > 0 && <IneligibleList rows={ineligible} />}

          <Field label="Challenge name" error={errors.name}>
            {(props) => (
              <input
                {...props}
                value={effectiveName}
                onChange={(e) => setName(e.target.value)}
                className={inputClass(Boolean(errors.name))}
              />
            )}
          </Field>

          {customisable && (
            <Field
              label={type === "goal-sprint" ? "Sprint target" : "Total to save"}
              error={errors.target}
              hint={
                suggested !== null
                  ? `Suggested: ${money(suggested)} — one month of this goal's plan, plus up to one more towards catching up. Change it to whatever suits you.`
                  : type === "goal-sprint"
                    ? "This goal has no regular contribution set, so there's no figure to suggest. Enter what you'd like to put away."
                    : undefined
              }
            >
              {(props) => (
                <input
                  {...props}
                  inputMode="decimal"
                  value={effectiveTarget}
                  placeholder="0"
                  onChange={(e) => setTarget(e.target.value)}
                  className={inputClass(Boolean(errors.target))}
                />
              )}
            </Field>
          )}

          {type === "custom-weekly" && (
            <Field label="Over how many weeks" error={errors.weeks}>
              {(props) => (
                <input
                  {...props}
                  inputMode="numeric"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  className={inputClass(Boolean(errors.weeks))}
                />
              )}
            </Field>
          )}

          <Field
            label="First step falls on"
            error={errors.startDate}
            hint="Pick an earlier date if you've already been running this."
          >
            {(props) => (
              <input
                {...props}
                type="date"
                value={effectiveStart}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateInputClass(Boolean(errors.startDate))}
              />
            )}
          </Field>
        </div>
      </Panel>

      {preview && <SchedulePreview steps={preview} type={type} startDate={effectiveStart} />}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Start this challenge</Button>
        <p className="text-[12px] text-muted">
          Nothing is saved to your goal until you tick a step.
        </p>
      </div>
    </form>
  );
}

const specFor = (
  type: ChallengeType,
  targetCents: number | null,
  weeks: number,
): ChallengeSpec => {
  switch (type) {
    case "custom-weekly":
      return { type, targetCents: targetCents ?? 0, weeks };
    case "goal-sprint":
      return { type, targetCents: targetCents ?? 0, days: SPRINT_DAYS };
    default:
      return { type };
  }
};

/** The schedule as it will actually be generated — no illustrative figures. */
function SchedulePreview({
  steps,
  type,
  startDate,
}: {
  steps: number[];
  type: ChallengeType;
  startDate: string;
}) {
  const total = steps.reduce((a, b) => a + b, 0);
  const perStep = type === "goal-sprint" ? 1 : 7;
  const lastDate = addDays(startDate, (steps.length - 1) * perStep);
  const unit = type === "goal-sprint" ? "day" : "week";
  const flat = steps.every((c) => c === steps[0]);

  return (
    <Panel title="What you're signing up to">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Figure label="TOTAL" value={money(total)} />
        <Figure label="STEPS" value={`${steps.length} ${unit}${steps.length === 1 ? "" : "s"}`} />
        <Figure
          label={flat ? "EACH STEP" : "FIRST TO LAST"}
          value={
            flat
              ? moneyExact(steps[0])
              : `${moneyExact(steps[0])} → ${moneyExact(steps[steps.length - 1])}`
          }
        />
        <Figure label="LAST STEP" value={fullDate(lastDate)} />
      </dl>
    </Panel>
  );
}

const Figure = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-[10px] tracking-[0.12em] text-muted">{label}</dt>
    <dd className="tabular m-0 text-[15px] font-medium">{value}</dd>
  </div>
);

/** Goals that were considered and set aside, with the reason stated plainly. */
function IneligibleList({
  rows,
}: {
  rows: Array<{ goal: { id: string; name: string; emoji?: string }; reason: unknown }>;
}) {
  return (
    <ul className="flex list-none flex-col gap-1 p-0">
      {rows.map(({ goal, reason }) => (
        <li key={goal.id} className="flex flex-wrap items-baseline gap-2 text-[12px] text-muted opacity-70">
          <span>
            {goal.emoji ? `${goal.emoji} ` : ""}
            {goal.name}
          </span>
          <span>
            —{" "}
            {
              CHALLENGE_INELIGIBILITY_TEXT[
                reason as keyof typeof CHALLENGE_INELIGIBILITY_TEXT
              ]
            }
          </span>
        </li>
      ))}
    </ul>
  );
}
