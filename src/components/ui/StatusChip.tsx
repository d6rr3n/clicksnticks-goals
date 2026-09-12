import type { GoalStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/goals";
import { AlertIcon, CheckIcon } from "../icons";

/**
 * Status always pairs colour with a label and an icon: rose-deep and clay sit
 * 1.12:1 apart in luminance, so hue alone is not a signal many viewers can read.
 */
const STYLE: Record<GoalStatus, string> = {
  "on-track": "bg-surface/95 text-sidebar",
  behind: "bg-clay text-[#FFF7F1]",
  complete: "bg-rose-deeper text-[#FFF6F3]",
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
        className={`h-[11px] w-[11px] ${status === "on-track" ? "text-rose-deep" : ""}`}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
