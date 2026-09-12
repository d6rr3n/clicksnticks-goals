"use client";

import Link from "next/link";
import type { Contribution, Goal } from "@/lib/schema";
import { FREQUENCY_LABEL } from "@/lib/schema";
import { balanceCents, percentComplete, remainingCents, statusOf } from "@/lib/calc";
import { monthsAgainstTarget, projectionFor } from "@/lib/forecast";
import { explainAgainstTarget, explainProjection } from "@/lib/explain";
import { money } from "@/lib/money";
import { fullDate, monthYear } from "@/lib/dates";
import { ProgressBar } from "../ui/ProgressBar";
import { StatusChip } from "../ui/StatusChip";
import { ArrowRightIcon } from "../icons";

/**
 * One goal's forecast: the figures, then the same thing said in a sentence.
 * The sentence comes first in reading order on purpose — the customer should
 * understand the answer before the arithmetic.
 */
export function GoalForecastPanel({
  goal,
  contributions,
  now,
}: {
  goal: Goal;
  contributions: Contribution[];
  now: Date;
}) {
  const projection = projectionFor(goal, contributions, now);
  const status = statusOf(goal, contributions, now);
  const against = monthsAgainstTarget(goal, projection);
  const headline = explainProjection(goal, projection);
  const aside = explainAgainstTarget(projection, against);

  const rows: Array<{ label: string; value: string }> = [
    { label: "Current saved", value: money(balanceCents(goal, contributions)) },
    { label: "Target amount", value: money(goal.targetCents) },
    { label: "Amount remaining", value: money(remainingCents(goal, contributions)) },
    {
      label: "Regular contribution",
      value:
        goal.contributionCents > 0
          ? `${money(goal.contributionCents)} ${FREQUENCY_LABEL[goal.frequency].toLowerCase()}`
          : "None set",
    },
    { label: "Target date", value: fullDate(goal.targetDate) },
    {
      label: "Projected completion",
      value:
        projection.kind === "complete"
          ? "Complete"
          : projection.kind === "unable"
            ? "Can't project yet"
            : fullDate(projection.date),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* The answer. */}
      <div
        className={`rounded-card px-4 py-3.5 ${
          projection.kind === "unable"
            ? "bg-warm-soft text-primary"
            : status === "behind"
              ? "bg-warm-soft text-warning"
              : "bg-tint-soft/70 text-primary"
        }`}
      >
        <p className="text-[13.5px] leading-relaxed">{headline}</p>
        {aside && <p className="mt-1 text-[12px] opacity-80">{aside}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusChip status={status} />
        <span className="tabular text-[13px] text-muted">
          {money(balanceCents(goal, contributions))} of {money(goal.targetCents)}
        </span>
        <div className="min-w-[160px] flex-1">
          <ProgressBar
            fraction={percentComplete(goal, contributions)}
            status={status}
            label={`${goal.name} progress`}
          />
        </div>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[9.5px] font-medium tracking-[0.14em] text-muted">
              {r.label.toUpperCase()}
            </dt>
            <dd className="tabular m-0 mt-1 text-[15px] font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/goals/${goal.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-[13px] text-primary no-underline transition-colors hover:bg-background"
        >
          Open goal
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {projection.kind === "projected" && against !== null && against < 0 && (
        <p className="text-[12px] text-muted">
          Your target is {monthYear(goal.targetDate)}.
        </p>
      )}
    </div>
  );
}
