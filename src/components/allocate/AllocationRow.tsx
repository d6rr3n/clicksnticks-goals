"use client";

import { useId } from "react";
import type { Allocation } from "@/lib/allocate";
import { explainAllocation } from "@/lib/explain";
import { money, parseAmount, toDollars } from "@/lib/money";
import { monthYear } from "@/lib/dates";
import { ArrowRightIcon, CheckIcon } from "../icons";

/**
 * One goal's line in the plan.
 *
 * Eligible goals are editable and carry their before/after dates. Goals that
 * were considered and set aside stay visible but quiet — it matters that the
 * customer can see nothing was ignored, and it matters more that they aren't
 * distracted by it.
 */
export function AllocationRow({
  allocation,
  onChange,
  maxCents,
}: {
  allocation: Allocation;
  onChange?: (cents: number) => void;
  /** The most this row may take: what the goal needs, or what's left. */
  maxCents?: number;
}) {
  const id = useId();
  const reason = explainAllocation(allocation);

  if (!allocation.eligible) {
    return (
      <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-1 py-3 last:border-0 opacity-55">
        <span className="text-[13.5px] text-muted">
          {allocation.emoji ? `${allocation.emoji} ` : ""}
          {allocation.name}
        </span>
        <span className="tabular text-[13.5px] text-muted">$0</span>
        <span className="text-[12px] text-muted">{reason}</span>
      </li>
    );
  }

  const moved =
    allocation.before.kind === "projected" &&
    (allocation.after.kind === "complete" ||
      (allocation.after.kind === "projected" &&
        allocation.after.date !== allocation.before.date));

  return (
    <li className="flex flex-col gap-2.5 border-b border-border px-1 py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-medium">
          {allocation.emoji ? `${allocation.emoji} ` : ""}
          {allocation.name}
        </label>

        <div className="flex items-center gap-2">
          <span aria-hidden className="text-[15px] text-muted">
            $
          </span>
          <input
            id={id}
            inputMode="decimal"
            readOnly={!onChange}
            value={allocation.amountCents === 0 ? "" : String(toDollars(allocation.amountCents))}
            placeholder="0"
            aria-describedby={`${id}-reason`}
            onChange={(e) => {
              if (!onChange) return;
              const parsed = parseAmount(e.target.value === "" ? "0" : e.target.value);
              if (parsed === null) return;
              const capped = Math.min(Math.max(parsed, 0), maxCents ?? parsed);
              onChange(capped);
            }}
            className="tabular w-28 rounded-[10px] border border-border bg-surface px-3 py-2 text-right text-[15px] font-medium text-primary transition-colors read-only:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          />
        </div>
      </div>

      <p id={`${id}-reason`} className="text-[12.5px] leading-relaxed text-muted">
        {reason}
      </p>

      {allocation.amountCents > 0 && (
        <p className="tabular flex flex-wrap items-center gap-2 text-[12px]">
          {allocation.completesGoal ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] text-on-primary">
              <CheckIcon className="h-3 w-3" />
              Fully funded
            </span>
          ) : allocation.backOnTrack ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-[11px] text-on-primary">
              <CheckIcon className="h-3 w-3" />
              Back on track
            </span>
          ) : null}

          {moved && allocation.before.kind === "projected" && (
            <span className="inline-flex items-center gap-1.5 text-muted">
              {monthYear(allocation.before.date)}
              <ArrowRightIcon className="h-3 w-3 text-secondary" />
              <b className="font-semibold text-primary">
                {allocation.after.kind === "complete"
                  ? "done"
                  : allocation.after.kind === "projected"
                    ? monthYear(allocation.after.date)
                    : "—"}
              </b>
            </span>
          )}

          <span className="ml-auto text-muted">
            {money(Math.max(allocation.factors.remainingCents - allocation.amountCents, 0))} still to go
          </span>
        </p>
      )}
    </li>
  );
}
