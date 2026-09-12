import Link from "next/link";
import { ProgressBar } from "../ui/ProgressBar";
import { ArrowRightIcon } from "../icons";
import { money } from "@/lib/money";
import { challengeProgress, stepWord } from "@/lib/challenges";
import { CHALLENGE_TYPE_LABEL, type Challenge, type Contribution, type Goal } from "@/lib/schema";

/**
 * One challenge in the list. The linked goal is named on the card because a
 * challenge with no goal attached to it is just a chart — the point is which
 * real thing it is moving.
 */
export function ChallengeListCard({
  challenge,
  goal,
  contributions,
}: {
  challenge: Challenge;
  goal: Goal | undefined;
  contributions: Contribution[];
}) {
  const progress = challengeProgress(challenge, contributions);
  const unit = stepWord(challenge.cadence);
  const fraction =
    progress.plannedCents > 0
      ? Math.min(progress.savedCents / progress.plannedCents, 1)
      : 0;

  return (
    <li>
      <Link
        href={`/challenges/${challenge.id}`}
        className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 text-primary no-underline transition-colors hover:border-secondary"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-display text-[17px] font-semibold">{challenge.name}</span>
          <span className="text-[11px] tracking-[0.1em] text-muted">
            {CHALLENGE_TYPE_LABEL[challenge.type].toUpperCase()}
          </span>
        </div>

        <p className="text-[12.5px] text-muted">
          {goal ? (
            <>
              Saving towards {goal.emoji ? `${goal.emoji} ` : ""}
              <b className="font-medium text-primary">{goal.name}</b>
            </>
          ) : (
            "The linked goal no longer exists."
          )}
          {challenge.archivedAt && " · Archived"}
        </p>

        <ProgressBar
          fraction={fraction}
          status={progress.complete ? "complete" : "on-track"}
          label={`${challenge.name} progress`}
        />

        <p className="tabular flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          <b className="font-semibold">{money(progress.savedCents)}</b>
          <span className="text-muted">of {money(progress.plannedCents)}</span>
          <span className="text-muted">
            · {progress.stepsDone} of {progress.totalSteps} {unit}
            {progress.totalSteps === 1 ? "" : "s"}
          </span>
          <ArrowRightIcon className="ml-auto h-3.5 w-3.5 text-secondary" />
        </p>
      </Link>
    </li>
  );
}
