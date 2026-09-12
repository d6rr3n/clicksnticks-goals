import { ArrowRightIcon, CheckIcon } from "../icons";
import { monthYear } from "@/lib/dates";
import { explainChallengeIfFinished, explainChallengeImpact } from "@/lib/explain";
import type { ChallengeImpact } from "@/lib/challenges";

/**
 * What this challenge has done to the goal, from the same forecast the rest of
 * the app uses. The before/after dates are the two projections side by side —
 * a shift the customer can check against the goal's own page, not a number
 * invented to sound encouraging.
 */
export function ChallengeImpactPanel({
  impact,
  goalName,
}: {
  impact: ChallengeImpact;
  goalName: string;
}) {
  const moved =
    impact.before.kind === "projected" &&
    (impact.after.kind === "complete" ||
      (impact.after.kind === "projected" && impact.after.date !== impact.before.date));

  const ifFinished = explainChallengeIfFinished(impact, goalName);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-relaxed">
        {explainChallengeImpact(impact, goalName)}
      </p>

      {moved && impact.before.kind === "projected" && (
        <p className="tabular flex flex-wrap items-center gap-2 rounded-card bg-surface-alt px-4 py-3 text-[12.5px]">
          <span className="text-muted">{goalName} lands</span>
          <span className="text-muted line-through">{monthYear(impact.before.date)}</span>
          <ArrowRightIcon className="h-3 w-3 text-secondary" />
          <b className="font-semibold">
            {impact.after.kind === "complete" ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-success" />
                fully funded
              </span>
            ) : impact.after.kind === "projected" ? (
              monthYear(impact.after.date)
            ) : (
              "—"
            )}
          </b>
        </p>
      )}

      {ifFinished && <p className="text-[12.5px] leading-relaxed text-muted">{ifFinished}</p>}
    </div>
  );
}
