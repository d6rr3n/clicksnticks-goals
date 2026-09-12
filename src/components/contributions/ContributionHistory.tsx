"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { dateInputClass, Field, inputClass } from "../ui/Field";
import { MinusIcon, PlusIcon } from "../icons";
import { useGoals } from "@/lib/store/GoalsStore";
import { runningBalances } from "@/lib/calc";
import { money, moneyExact, parseAmount, signedMoney, toDollars } from "@/lib/money";
import { fullDate, toISODate } from "@/lib/dates";
import { isValid, validateContribution, type ContributionField, type Errors } from "@/lib/validate";
import type { Contribution, Goal } from "@/lib/schema";

/**
 * The ledger, oldest first with a running balance, so the arithmetic is
 * checkable by eye. Any row can be corrected or removed.
 */
export function ContributionHistory({ goal }: { goal: Goal }) {
  const { data, updateContribution, deleteContribution } = useGoals();
  const rows = runningBalances(goal, data.contributions);

  const [editing, setEditing] = useState<Contribution | null>(null);
  const [deleting, setDeleting] = useState<Contribution | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed text-muted">
        No contributions logged yet. The first one is the hard one.
        {goal.openingBalanceCents > 0 && (
          <>
            {" "}
            Starting balance is {money(goal.openingBalanceCents)}.
          </>
        )}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Contribution history for {goal.name}, oldest first
          </caption>
          <thead>
            <tr className="text-[9.5px] tracking-[0.14em] text-muted">
              <th scope="col" className="py-2 font-medium">DATE</th>
              <th scope="col" className="py-2 font-medium">AMOUNT</th>
              <th scope="col" className="py-2 text-right font-medium">BALANCE</th>
              <th scope="col" className="py-2 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border text-[12.5px] text-muted">
              <td className="py-2.5">Starting balance</td>
              <td className="py-2.5">—</td>
              <td className="tabular py-2.5 text-right">{moneyExact(goal.openingBalanceCents)}</td>
              <td />
            </tr>
            {rows.map((row) => {
              const deposit = row.amountCents > 0;
              return (
                <tr key={row.id} className="border-t border-border align-middle">
                  <td className="tabular py-2.5 text-[12.5px] whitespace-nowrap">
                    {fullDate(row.date)}
                    {row.note && (
                      <span className="block text-[11px] text-muted">{row.note}</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                          deposit ? "bg-tint-soft" : "bg-warm"
                        }`}
                      >
                        {deposit ? (
                          <PlusIcon className="h-3 w-3 text-primary" />
                        ) : (
                          <MinusIcon className="h-3 w-3 text-warning" />
                        )}
                      </span>
                      <span
                        className={`tabular text-[13px] font-medium ${
                          deposit ? "" : "text-warning"
                        }`}
                      >
                        {signedMoney(row.amountCents)}
                      </span>
                    </span>
                  </td>
                  <td className="tabular py-2.5 text-right text-[13px]">
                    {moneyExact(row.balanceAfterCents)}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="inline-flex min-h-[28px] items-center rounded px-2 py-1 text-[11.5px] text-secondary hover:underline"
                    >
                      Edit<span className="sr-only"> contribution of {signedMoney(row.amountCents)} on {fullDate(row.date)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(row)}
                      className="inline-flex min-h-[28px] items-center rounded px-2 py-1 text-[11.5px] text-warning hover:underline"
                    >
                      Delete<span className="sr-only"> contribution of {signedMoney(row.amountCents)} on {fullDate(row.date)}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditDialog
        contribution={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) updateContribution(editing.id, patch);
          setEditing(null);
        }}
      />

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this contribution?"
        description={
          deleting
            ? `${signedMoney(deleting.amountCents)} on ${fullDate(deleting.date)} will be removed and the balance recalculated.`
            : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (deleting) deleteContribution(deleting.id);
              setDeleting(null);
            }}
          >
            Delete contribution
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function EditDialog({
  contribution,
  onClose,
  onSave,
}: {
  contribution: Contribution | null;
  onClose: () => void;
  onSave: (patch: { amountCents: number; date: string; note?: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors<ContributionField>>({});
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Load the row's values the first time this particular row is opened.
  if (contribution && contribution.id !== loadedId) {
    setLoadedId(contribution.id);
    setAmount(String(toDollars(contribution.amountCents)));
    setDate(contribution.date);
    setNote(contribution.note ?? "");
    setErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateContribution({ amount, date });
    setErrors(found);
    if (!isValid(found)) return;
    onSave({ amountCents: parseAmount(amount)!, date, note: note.trim() || undefined });
  }

  return (
    <Dialog
      open={Boolean(contribution)}
      onClose={onClose}
      title="Edit contribution"
      description="Correcting this updates every figure that depends on it."
      labelledBy="edit-contribution-title"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label="Amount" error={errors.amount} hint="Use a minus sign for a withdrawal.">
          {(p) => (
            <input
              {...p}
              inputMode="decimal"
              className={inputClass(Boolean(errors.amount))}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>

        <Field label="Date" error={errors.date}>
          {(p) => (
            <input
              {...p}
              type="date"
              max={toISODate(new Date())}
              className={dateInputClass(Boolean(errors.date))}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>

        <Field label="Note" optional>
          {(p) => (
            <input
              {...p}
              className={inputClass()}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tax refund"
            />
          )}
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save changes</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
