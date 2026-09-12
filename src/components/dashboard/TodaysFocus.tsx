"use client";

import Link from "next/link";
import type { Contribution, Goal } from "@/lib/schema";
import { balanceCents, percentComplete, statusOf } from "@/lib/calc";
import { money } from "@/lib/money";
import { ProgressBar } from "../ui/ProgressBar";
import { ArrowRightIcon, TargetIcon } from "../icons";

export function TodaysFocus({
  goal,
  contributions,
  now,
}: {
  goal: Goal;
  contributions: Contribution[];
  now: Date;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-panel bg-blush p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-forest">
        <TargetIcon className="h-4 w-4 text-sage-deep" />
        Today&apos;s Focus
      </h2>

      <div className="flex flex-col gap-2 rounded-card bg-surface/72 p-3.5">
        <h3 className="font-display text-[17px] font-semibold">
          {goal.emoji ? `${goal.emoji} ` : ""}
          {goal.name}
        </h3>
        <p className="tabular text-[17px] font-medium">
          {money(balanceCents(goal, contributions))}{" "}
          <span className="text-xs font-normal text-muted">/ {money(goal.targetCents)}</span>
        </p>
        <ProgressBar
          fraction={percentComplete(goal, contributions)}
          status={statusOf(goal, contributions, now)}
          label={`${goal.name} progress`}
        />
      </div>

      <Link
        href={`/goals/${goal.id}`}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-[13px] text-cream no-underline transition-colors hover:bg-sage-deep"
      >
        View Goal
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
