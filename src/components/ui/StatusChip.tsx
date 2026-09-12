import type { GoalStatus } from "@/lib/schema";

const STATUS_LABEL: Record<GoalStatus, string> = {
  "on-track": "On track",
  behind: "Behind",
  complete: "Complete",
};
import { AlertIcon, CheckIcon } from "../icons";

/**
 * Status always pairs colour with a label and an icon. In the Sage edition
 * success and warning sit 1.31:1 apart in luminance — and 1.11:1 in Blush —
 * so hue alone is not a signal many viewers can read.
 */
const STYLE: Record<GoalStatus, string> = {
  "on-track": "bg-surface/95 text-primary",
  behind: "bg-warning text-on-primary",
  complete: "bg-primary text-on-primary",
};

export function StatusChip({
  status,
  className = "",
}: {
  status: GoalStatus;
  className?: string;
}) {
  const Icon = status === "behind" ? AlertIcon : CheckIcon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-[7px] text-[10px] font-medium ${STYLE[status]} ${className}`}
    >
      <Icon
        className={`h-[11px] w-[11px] ${status === "on-track" ? "text-success" : ""}`}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
