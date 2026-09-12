"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "../ui/Button";
import { Field, dateInputClass, inputClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { useGoals } from "@/lib/store/GoalsStore";
import {
  SPRINT_DAYS,
  canEditSchedule,
  hasEditableSchedule,
  plannedTotalCents,
} from "@/lib/challenges";
import { money, parseAmount, toDollars } from "@/lib/money";
import {
  isValid,
  validateChallenge,
  type ChallengeField,
  type Errors,
} from "@/lib/validate";
import { CHALLENGE_TYPE_LABEL, type Challenge } from "@/lib/schema";

/**
 * Editing what can honestly be edited.
 *
 * The name and the start date are labels on a plan and change freely. The
 * schedule is a different thing: once a step has recorded money, those
 * amounts are what the customer was told they saved, so the controls go away
 * and say why rather than sitting there disabled and unexplained.
 */
export function EditChallengeForm({ challenge }: { challenge: Challenge }) {
  const router = useRouter();
  const { data, updateChallenge } = useGoals();

  const [name, setName] = useState(challenge.name);
  const [startDate, setStartDate] = useState(challenge.startDate);
  const [target, setTarget] = useState(
    String(toDollars(plannedTotalCents(challenge))),
  );
  const [weeks, setWeeks] = useState(String(challenge.stepCents.length));
  const [errors, setErrors] = useState<Errors<ChallengeField>>({});

  const scheduleEditable =
    hasEditableSchedule(challenge) && canEditSchedule(challenge, data.contributions);
  const scheduleLocked =
    hasEditableSchedule(challenge) && !canEditSchedule(challenge, data.contributions);

  const targetCents = parseAmount(target);
  const weekCount = Number(weeks);

  /*
   * The schedule fields hold the challenge's current values whether or not
   * they are on screen, so a locked challenge validates against what it
   * already is rather than against a blank.
   */
  const input = {
    type: challenge.type,
    goalId: challenge.goalId,
    name,
    target,
    weeks,
    startDate,
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateChallenge(input);
    setErrors(found);
    if (!isValid(found)) return;

    updateChallenge(challenge.id, {
      name: name.trim(),
      startDate,
      spec: scheduleEditable
        ? challenge.type === "custom-weekly"
          ? { type: "custom-weekly", targetCents: targetCents ?? 0, weeks: weekCount }
          : { type: "goal-sprint", targetCents: targetCents ?? 0, days: SPRINT_DAYS }
        : undefined,
    });
    router.push(`/challenges/${challenge.id}`);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Panel title={CHALLENGE_TYPE_LABEL[challenge.type]}>
        <div className="flex flex-col gap-4">
          <Field label="Challenge name" error={errors.name}>
            {(props) => (
              <input
                {...props}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass(Boolean(errors.name))}
              />
            )}
          </Field>

          <Field
            label="First step falls on"
            error={errors.startDate}
            hint="Only the dates shown against each step move. Nothing already recorded changes."
          >
            {(props) => (
              <input
                {...props}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateInputClass(Boolean(errors.startDate))}
              />
            )}
          </Field>

          {scheduleEditable && (
            <>
              <Field
                label={challenge.type === "goal-sprint" ? "Sprint target" : "Total to save"}
                error={errors.target}
                hint="Changing this rebuilds the steps."
              >
                {(props) => (
                  <input
                    {...props}
                    inputMode="decimal"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className={inputClass(Boolean(errors.target))}
                  />
                )}
              </Field>

              {challenge.type === "custom-weekly" && (
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
            </>
          )}

          {scheduleLocked && (
            <p className="rounded-card bg-surface-alt px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
              The steps are set now that you&apos;ve started ticking them —{" "}
              {money(plannedTotalCents(challenge))} across{" "}
              {challenge.stepCents.length}{" "}
              {challenge.cadence === "weekly" ? "weeks" : "days"}. Changing the
              amounts would rewrite what you were told you&apos;d saved. Start a
              new challenge if you want different numbers.
            </p>
          )}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Save changes</Button>
        <ButtonLink variant="secondary" href={`/challenges/${challenge.id}`}>
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
