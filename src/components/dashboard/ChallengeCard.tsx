import Link from "next/link";
import { money } from "@/lib/money";
import { ProgressBar } from "../ui/ProgressBar";
import { PlusIcon } from "../icons";
import {
  challengeProgress,
  featuredChallenge,
  stepWord,
} from "@/lib/challenges";
import type { Challenge, Contribution, Goal } from "@/lib/schema";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The dashboard's way into Challenges.
 *
 * Every figure here comes from the customer's own challenge and ledger. The
 * card used to render an illustrative 52-week challenge at week 36, which was
 * fine while the feature was a sketch and misleading the moment it wasn't.
 */
export function ChallengeCard({
  challenges,
  goals,
  contributions,
}: {
  challenges: Challenge[];
  goals: Goal[];
  contributions: Contribution[];
}) {
  const challenge = featuredChallenge(challenges, contributions);

  if (!challenge) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-background p-4">
        <p className="text-[12.5px] leading-relaxed text-muted">
          Fifty-two weeks, starting at a dollar. Or thirty days aimed at one
          goal. A challenge turns a big number into small ones.
        </p>
        <Link
          href="/challenges/new"
          className="inline-flex min-h-[24px] items-center gap-1.5 text-[12.5px] text-secondary no-underline hover:underline"
        >
          <PlusIcon className="h-3 w-3" />
          Start a challenge
        </Link>
      </div>
    );
  }

  const goal = goals.find((g) => g.id === challenge.goalId);
  const progress = challengeProgress(challenge, contributions);
  const unit = stepWord(challenge.cadence);
  const fraction =
    progress.plannedCents > 0
      ? Math.min(progress.savedCents / progress.plannedCents, 1)
      : 0;

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-background p-3 text-primary no-underline transition-colors hover:border-secondary"
    >
      <div className="grid h-[74px] w-[74px] shrink-0 place-content-center rounded-xl bg-gradient-to-br from-secondary to-primary p-1.5 text-center leading-tight text-on-primary">
        <b className="font-display text-2xl font-semibold">{progress.totalSteps}</b>
        <span className="text-[8.5px] tracking-[0.1em]">
          {unit.toUpperCase()}
          <br />
          CHALLENGE
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="tabular truncate text-xs text-muted">
          {/* The step you're up to — which is the first one not yet ticked,
              not the count of ticked ones, since they can be done in any order. */}
          {progress.nextStep === null
            ? "Every step ticked"
            : `${capitalise(unit)} ${progress.nextStep + 1} of ${progress.totalSteps}`}
          {goal && ` · ${goal.name}`}
        </p>
        <p className="tabular text-[15.5px] font-medium">
          {money(progress.savedCents)}{" "}
          <span className="text-xs font-normal text-muted">
            / {money(progress.plannedCents)}
          </span>
        </p>
        <ProgressBar
          fraction={fraction}
          status={progress.complete ? "complete" : "on-track"}
          label={`${challenge.name} progress`}
        />
      </div>
    </Link>
  );
}
