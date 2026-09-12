"use client";

import type { AllocationPlan } from "@/lib/allocate";
import { describeMonths } from "@/lib/explain";
import { money } from "@/lib/money";
import { monthYear } from "@/lib/dates";
import { ArrowRightIcon } from "../icons";

/**
 * What the plan changes, in four lines a side. Only the rows that actually
 * move are emphasised, so the difference is the thing the eye lands on.
 */
export function BeforeAfter({ plan }: { plan: AllocationPlan }) {
  const rows: Array<{ label: string; before: string; after: string }> = [
    {
      label: "Goals on track",
      before: `${plan.before.onTrackCount} of ${plan.before.activeCount}`,
      after: `${plan.after.onTrackCount} of ${plan.after.activeCount}`,
    },
    {
      label: "Total saved",
      before: money(plan.before.totalSavedCents),
      after: money(plan.after.totalSavedCents),
    },
    {
      label: "Still to go",
      before: money(plan.before.totalRemainingCents),
      after: money(plan.after.totalRemainingCents),
    },
    {
      label: "Next goal to land",
      before: plan.before.nextToComplete
        ? `${plan.before.nextToComplete.name}, ${monthYear(plan.before.nextToComplete.date)}`
        : "—",
      after: plan.after.nextToComplete
        ? `${plan.after.nextToComplete.name}, ${monthYear(plan.after.nextToComplete.date)}`
        : "—",
    },
  ];

  const headline =
    plan.backOnTrackCount > 0
      ? plan.backOnTrackCount === 1
        ? "One goal comes back on track"
        : `${plan.backOnTrackCount} goals come back on track`
      : plan.monthsSaved > 0
        ? `${describeMonths(plan.monthsSaved)} off your goals`
        : "Your plan stays as it is";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-primary px-5 py-4 text-on-primary">
        <p className="font-display text-[clamp(20px,3vw,26px)] leading-tight font-semibold text-balance">
          {headline}
        </p>
        {plan.monthsSaved > 0 && plan.backOnTrackCount > 0 && (
          <p className="mt-1.5 text-[13px] text-on-primary/75">
            And about {describeMonths(plan.monthsSaved)} saved across everything.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Side title="Before" rows={rows} pick="before" tone="quiet" />
        <div aria-hidden className="hidden place-items-center text-secondary sm:grid">
          <ArrowRightIcon className="h-5 w-5" />
        </div>
        <Side title="After" rows={rows} pick="after" tone="loud" />
      </div>
    </div>
  );
}

function Side({
  title,
  rows,
  pick,
  tone,
}: {
  title: string;
  rows: Array<{ label: string; before: string; after: string }>;
  pick: "before" | "after";
  tone: "quiet" | "loud";
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
        {rows.map((row) => {
          const changed = row.before !== row.after;
          return (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-[12px] text-muted">{row.label}</dt>
              <dd
                className={`tabular m-0 text-right text-[13.5px] ${
                  changed && tone === "loud" ? "font-semibold text-primary" : "font-medium"
                }`}
              >
                {row[pick]}
                {changed && tone === "loud" && <span className="sr-only"> (changed)</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
