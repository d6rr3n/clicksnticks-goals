"use client";

import type { AllocationPlan } from "@/lib/allocate";
import { money } from "@/lib/money";
import { fullDate, toISODate } from "@/lib/dates";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

/**
 * The last step, and the only one that writes.
 *
 * Every line is named with its amount, the total is restated, and the customer
 * is told plainly what applying does: it records contributions dated today. It
 * does not move money between accounts, because the app has no way to.
 */
export function ApplyAllocationDialog({
  open,
  plan,
  now,
  onClose,
  onConfirm,
}: {
  open: boolean;
  plan: AllocationPlan;
  now: Date;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const lines = plan.allocations.filter((a) => a.amountCents > 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add these to your goals?"
      description={`These will be recorded as contributions dated ${fullDate(toISODate(now))}.`}
      labelledBy="apply-allocation-title"
    >
      <ul className="flex list-none flex-col gap-2.5 rounded-card bg-surface-alt p-4">
        {lines.map((line) => (
          <li key={line.goalId} className="flex items-baseline justify-between gap-3">
            <span className="text-[13.5px]">
              {line.emoji ? `${line.emoji} ` : ""}
              {line.name}
            </span>
            <span className="tabular text-[14px] font-semibold text-primary">
              {money(line.amountCents)}
            </span>
          </li>
        ))}

        <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
          <span className="text-[9.5px] font-medium tracking-[0.14em] text-muted">
            TOTAL
          </span>
          <span className="tabular font-display text-[18px] font-semibold">
            {money(plan.totalAllocatedCents)}
          </span>
        </li>
      </ul>

      {plan.unallocatedCents > 0 && (
        <p className="text-[12px] text-muted">
          {money(plan.unallocatedCents)} stays unallocated — nothing will be
          recorded for it.
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-muted">
        This only records the contributions. It doesn&apos;t move money between
        your accounts.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm}>Confirm</Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
