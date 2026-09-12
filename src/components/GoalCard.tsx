"use client";

import Link from "next/link";
import type { Contribution, Goal } from "@/lib/schema";
import { balanceCents, percentComplete, remainingCents, statusOf } from "@/lib/calc";
import { money } from "@/lib/money";
import { monthYear } from "@/lib/dates";
import { ProgressBar } from "./ui/ProgressBar";
import { StatusChip } from "./ui/StatusChip";
import { GoalImage } from "./goals/GoalImage";
import { CalendarIcon, CoinsIcon, FlagIcon } from "./icons";

const FALLBACK_THUMB = "from-[#B9C4BB] via-[#7E8F82] to-[#4F6157]";

export function GoalCard({
  goal,
  contributions,
  now,
}: {
  goal: Goal;
  contributions: Contribution[];
  now: Date;
}) {
  const status = statusOf(goal, contributions, now);
  const complete = status === "complete";

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-canvas no-underline transition-shadow hover:shadow-[0_8px_28px_-14px_rgba(23,46,44,.35)]"
    >
      <div className={`relative h-26 bg-gradient-to-br ${goal.thumb ?? FALLBACK_THUMB}`}>
        {goal.imageId && (
          <GoalImage
            imageId={goal.imageId}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-forest/30" />
        <StatusChip status={status} className="absolute top-2.5 left-2.5" />
        {goal.emoji && (
          <span aria-hidden className="absolute right-2.5 bottom-2 text-xl drop-shadow">
            {goal.emoji}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <h3 className="font-display text-[17.5px] font-semibold text-forest">{goal.name}</h3>

        <p className="tabular text-[17px] font-medium text-forest">
          {money(balanceCents(goal, contributions))}{" "}
          <span className="text-xs font-normal text-muted">/ {money(goal.targetCents)}</span>
        </p>

        <ProgressBar
          fraction={percentComplete(goal, contributions)}
          status={status}
          label={`${goal.name} progress`}
        />

        <div className="mt-auto flex flex-col gap-1.5 pt-1 text-[11.5px] text-muted">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-sage-deep" />
            {complete ? "Target: Complete" : `Target: ${monthYear(goal.targetDate)}`}
          </span>
          <span className="flex items-center gap-2">
            {complete ? (
              <>
                <FlagIcon className="h-3.5 w-3.5 shrink-0 text-sage-deep" />
                Goal achieved!
              </>
            ) : (
              <>
                <CoinsIcon className="h-3.5 w-3.5 shrink-0 text-sage-deep" />
                <span className="tabular">{money(remainingCents(goal, contributions))} to go</span>
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
