import Link from "next/link";
import type { Goal } from "@/lib/types";
import { progressOf, remainingOf, statusOf } from "@/lib/goals";
import { money, monthYear } from "@/lib/format";
import { ProgressBar } from "./ui/ProgressBar";
import { StatusChip } from "./ui/StatusChip";
import { CalendarIcon, CoinsIcon, FlagIcon } from "./icons";

export function GoalCard({ goal }: { goal: Goal }) {
  const status = statusOf(goal);
  const complete = status === "complete";

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-canvas no-underline transition-shadow hover:shadow-[0_8px_28px_-14px_rgba(36,28,27,.35)]"
    >
      <div className={`relative h-26 bg-gradient-to-br ${goal.thumb}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sidebar/30" />
        <StatusChip status={status} className="absolute top-2.5 left-2.5" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <h3 className="font-display text-[17.5px] font-semibold text-sidebar">
          {goal.name}
        </h3>

        <p className="tabular text-[17px] font-medium text-sidebar">
          {money(goal.saved)}{" "}
          <span className="text-xs font-normal text-muted">
            / {money(goal.target)}
          </span>
        </p>

        <ProgressBar
          fraction={progressOf(goal)}
          status={status}
          label={`${goal.name} progress`}
        />

        <div className="mt-auto flex flex-col gap-1.5 pt-1 text-[11.5px] text-muted">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-rose-deep" />
            {complete ? "Target: Complete" : `Target: ${monthYear(goal.targetDate)}`}
          </span>
          <span className="flex items-center gap-2">
            {complete ? (
              <>
                <FlagIcon className="h-3.5 w-3.5 shrink-0 text-rose-deep" />
                Goal achieved!
              </>
            ) : (
              <>
                <CoinsIcon className="h-3.5 w-3.5 shrink-0 text-rose-deep" />
                <span className="tabular">{money(remainingOf(goal))} to go</span>
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
