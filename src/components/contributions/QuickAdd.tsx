"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";
import { PlusIcon } from "../icons";
import { useGoals } from "@/lib/store/GoalsStore";
import { isComplete } from "@/lib/calc";
import { money, parseAmount } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import { isValid, validateContribution, type ContributionField, type Errors } from "@/lib/validate";
import type { Goal } from "@/lib/schema";

const PRESETS = [20_00, 50_00, 100_00];

/**
 * Quick Add. The presets cover the common case in one tap; the custom field is
 * there for everything else, including negative amounts to correct a mistake.
 */
export function QuickAdd({
  goals,
  defaultGoalId,
  lockGoal = false,
}: {
  goals: Goal[];
  defaultGoalId?: string;
  lockGoal?: boolean;
}) {
  const { addContribution, data } = useGoals();
  const open = goals.filter((g) => !g.archivedAt);

  const [goalId, setGoalId] = useState(defaultGoalId ?? open[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [errors, setErrors] = useState<Errors<ContributionField>>({});
  const [confirmation, setConfirmation] = useState<string | null>(null);

  if (open.length === 0) return null;

  const target = open.find((g) => g.id === goalId) ?? open[0];

  function record(amountCents: number) {
    const found = validateContribution({ amount: String(amountCents / 100), date });
    setErrors(found);
    if (!isValid(found)) return;

    addContribution({ goalId: target.id, amountCents, date });
    setAmount("");
    setConfirmation(`${money(amountCents)} added to ${target.name}.`);
    window.setTimeout(() => setConfirmation(null), 4000);
  }

  function onCustom(event: React.FormEvent) {
    event.preventDefault();
    const found = validateContribution({ amount, date });
    setErrors(found);
    if (!isValid(found)) return;
    record(parseAmount(amount)!);
  }

  return (
    <div className="flex flex-col gap-3.5">
      {!lockGoal && (
        <Field label="Goal">
          {(p) => (
            <select
              {...p}
              className={inputClass()}
              value={target.id}
              onChange={(e) => setGoalId(e.target.value)}
            >
              {open.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji ? `${g.emoji} ` : ""}
                  {g.name}
                  {isComplete(g, data.contributions) ? " — complete" : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => record(cents)}
            className="tabular inline-flex items-center gap-1.5 rounded-full border border-sage-deep/30 bg-sage-light/50 px-4 py-2.5 text-[13.5px] font-medium text-forest transition-colors hover:border-sage-deep hover:bg-sage-light"
          >
            <PlusIcon className="h-3.5 w-3.5 text-sage-deep" />
            {money(cents)}
          </button>
        ))}
      </div>

      <form onSubmit={onCustom} noValidate className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Custom amount" error={errors.amount}>
            {(p) => (
              <input
                {...p}
                inputMode="decimal"
                className={inputClass(Boolean(errors.amount))}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$75"
              />
            )}
          </Field>

          <Field label="Date" error={errors.date}>
            {(p) => (
              <input
                {...p}
                type="date"
                max={toISODate(new Date())}
                className={inputClass(Boolean(errors.date))}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Field>
        </div>

        <Button type="submit" className="self-start">
          Add contribution
        </Button>
      </form>

      <p role="status" aria-live="polite" className="min-h-[1.2em] text-[12.5px] text-sage-deep">
        {confirmation}
      </p>
    </div>
  );
}
