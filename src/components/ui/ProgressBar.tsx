import type { GoalStatus } from "@/lib/schema";

/**
 * The decorative tints are deliberately absent here. Against the track they
 * sit near 1.7:1 and do not read as a bar, so fills only ever use success,
 * warning or primary. See reference/README.md.
 */
const FILL: Record<GoalStatus, string> = {
  "on-track": "bg-success",
  behind: "bg-warning",
  complete: "bg-primary",
};

export function ProgressBar({
  fraction,
  status,
  showValue = true,
  label,
}: {
  fraction: number;
  status: GoalStatus;
  showValue?: boolean;
  label?: string;
}) {
  const pct = Math.round(fraction * 100);
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-track"
      >
        <div
          className={`h-full rounded-full ${FILL[status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="tabular min-w-[34px] text-right text-[12.5px] font-medium">
          {Math.round(fraction * 100)}%
        </span>
      )}
    </div>
  );
}
