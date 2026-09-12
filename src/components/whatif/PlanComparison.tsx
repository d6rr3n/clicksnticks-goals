"use client";

import type { Projection } from "@/lib/forecast";
import { describeMonths } from "@/lib/explain";
import { money } from "@/lib/money";
import { monthYear } from "@/lib/dates";
import { ArrowRightIcon } from "../icons";

/**
 * Current plan against the scenario. The headline answer sits above the
 * detail, large, so it reads in a couple of seconds; the four rows are there
 * for anyone who wants to check the working.
 */

export interface PlanSide {
  contribution: string;
  completion: string;
  timeRemaining: string;
  amountRemaining: string;
}

export const sideFrom = (
  projection: Projection,
  contribution: string,
  amountRemainingCents: number,
): PlanSide => ({
  contribution,
  completion:
    projection.kind === "complete"
      ? "Complete"
      : projection.kind === "unable"
        ? "No date yet"
        : monthYear(projection.date),
  timeRemaining:
    projection.kind === "complete"
      ? "—"
      : projection.kind === "unable"
        ? "—"
        : describeMonths(projection.months),
  amountRemaining: money(amountRemainingCents),
});

const ROWS: Array<{ key: keyof PlanSide; label: string }> = [
  { key: "contribution", label: "Contribution" },
  { key: "completion", label: "Completion" },
  { key: "timeRemaining", label: "Time remaining" },
  { key: "amountRemaining", label: "Still to go" },
];

export function PlanComparison({
  headline,
  subhead,
  current,
  scenario,
  changed,
}: {
  headline: string;
  subhead?: string;
  current: PlanSide;
  scenario: PlanSide;
  /** Rows that differ, highlighted so the change is obvious at a glance. */
  changed: Array<keyof PlanSide>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-primary px-5 py-4 text-on-primary">
        <p className="font-display text-[clamp(22px,3.2vw,30px)] leading-tight font-semibold text-balance">
          {headline}
        </p>
        {subhead && <p className="mt-1.5 text-[13px] text-on-primary/75">{subhead}</p>}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Side title="Current plan" side={current} tone="quiet" changed={[]} />

        <div
          aria-hidden
          className="hidden place-items-center text-secondary sm:grid"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </div>

        <Side title="What if" side={scenario} tone="loud" changed={changed} />
      </div>
    </div>
  );
}

function Side({
  title,
  side,
  tone,
  changed,
}: {
  title: string;
  side: PlanSide;
  tone: "quiet" | "loud";
  changed: Array<keyof PlanSide>;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-card p-4 ${
        tone === "loud"
          ? "border border-secondary/35 bg-tint-soft/60"
          : "border border-border bg-surface-alt"
      }`}
    >
      <h3
        className={`text-[9.5px] font-medium tracking-[0.16em] ${
          tone === "loud" ? "text-secondary" : "text-muted"
        }`}
      >
        {title.toUpperCase()}
      </h3>

      <dl className="m-0 flex flex-col gap-2.5">
        {ROWS.map((row) => {
          const isChanged = changed.includes(row.key);
          return (
            <div key={row.key} className="flex items-baseline justify-between gap-3">
              <dt className="text-[12px] text-muted">{row.label}</dt>
              <dd
                className={`tabular m-0 text-right text-[14px] ${
                  isChanged ? "font-semibold text-primary" : "font-medium"
                }`}
              >
                {side[row.key]}
                {isChanged && <span className="sr-only"> (changed)</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
