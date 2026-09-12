import Link from "next/link";
import type { Goal } from "@/lib/types";
import { progressOf, statusOf } from "@/lib/goals";
import { money } from "@/lib/format";
import { ProgressBar } from "../ui/ProgressBar";
import { ArrowRightIcon, TargetIcon } from "../icons";

export function TodaysFocus({ goal }: { goal: Goal }) {
  return (
    <div className="flex flex-col gap-3 rounded-panel bg-rose-light p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-rose-deeper">
        <TargetIcon className="h-4 w-4 text-rose-deep" />
        Today&apos;s Focus
      </h2>

      <div className="flex flex-col gap-2 rounded-card bg-surface/72 p-3.5">
        <h3 className="font-display text-[17px] font-semibold">{goal.name}</h3>
        <p className="tabular text-[17px] font-medium">
          {money(goal.saved)}{" "}
          <span className="text-xs font-normal text-muted">
            / {money(goal.target)}
          </span>
        </p>
        <ProgressBar
          fraction={progressOf(goal)}
          status={statusOf(goal)}
          label={`${goal.name} progress`}
        />
      </div>

      <Link
        href={`/goals/${goal.id}`}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-sidebar px-5 py-3 text-[13px] text-brand-cream no-underline transition-colors hover:bg-rose-deeper"
      >
        View Goal
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
