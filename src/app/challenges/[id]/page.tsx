"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { ChallengeGrid } from "@/components/challenges/ChallengeGrid";
import { ChallengeImpactPanel } from "@/components/challenges/ChallengeImpactPanel";
import { DeleteChallengeDialog } from "@/components/challenges/DeleteChallengeDialog";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import {
  challengeImpact,
  challengeProgress,
  stepDueDate,
  stepWord,
  tickBlock,
} from "@/lib/challenges";
import {
  CHALLENGE_TICK_BLOCK_TEXT,
  explainChallengeProgress,
} from "@/lib/explain";
import { money, moneyExact } from "@/lib/money";
import { fullDate } from "@/lib/dates";
import { CHALLENGE_TYPE_LABEL } from "@/lib/schema";

export default function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    hydrated,
    data,
    completeStep,
    uncompleteStep,
    archiveChallenge,
    restoreChallenge,
    deleteChallenge,
  } = useGoals();
  const now = useNow();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!hydrated) return <Skeleton />;

  const challenge = data.challenges.find((c) => c.id === id);
  if (!challenge) {
    return (
      <Panel title="Challenge not found">
        <p className="mb-4 text-[13px] leading-relaxed text-muted">
          This challenge may have been deleted.
        </p>
        <ButtonLink href="/challenges">Back to challenges</ButtonLink>
      </Panel>
    );
  }

  const goal = data.goals.find((g) => g.id === challenge.goalId);
  const progress = challengeProgress(challenge, data.contributions);
  const block = tickBlock(challenge, goal, data.contributions);
  const unit = stepWord(challenge.cadence);
  const fraction =
    progress.plannedCents > 0
      ? Math.min(progress.savedCents / progress.plannedCents, 1)
      : 0;

  return (
    <>
      <StoreNotices />

      <header className="flex flex-col gap-2">
        <Link
          href="/challenges"
          className="inline-flex min-h-[28px] items-center text-[11px] tracking-[0.14em] text-secondary no-underline hover:underline"
        >
          ← CHALLENGES
        </Link>
        <h1 className="font-display text-[clamp(26px,4vw,36px)] leading-none font-semibold tracking-tight">
          {challenge.name}
        </h1>
        <p className="text-[12.5px] text-muted">
          {CHALLENGE_TYPE_LABEL[challenge.type]}
          {goal && (
            <>
              {" · saving towards "}
              <Link href={`/goals/${goal.id}`} className="text-secondary no-underline hover:underline">
                {goal.emoji ? `${goal.emoji} ` : ""}
                {goal.name}
              </Link>
            </>
          )}
          {challenge.archivedAt && " · Archived"}
        </p>
      </header>

      <Panel>
        <div className="flex flex-col gap-3">
          <p className="tabular flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <b className="font-display text-[30px] leading-none font-semibold">
              {money(progress.savedCents)}
            </b>
            <span className="text-[13px] text-muted">
              of {money(progress.plannedCents)}
            </span>
          </p>
          <ProgressBar
            fraction={fraction}
            status={progress.complete ? "complete" : "on-track"}
            label={`${challenge.name} progress`}
          />
          <p className="text-[12.5px] text-muted">
            {explainChallengeProgress(progress, challenge.cadence)}
          </p>

          {progress.complete && (
            <p
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-card bg-tint-soft px-4 py-3.5 text-[13px]"
            >
              <CheckIcon className="h-5 w-5 shrink-0 text-success" />
              <span>
                Every {unit} ticked. That&apos;s {money(progress.savedCents)} saved,
                a bit at a time.
              </span>
            </p>
          )}

          {block && (
            <p
              role="status"
              className="flex flex-wrap items-start gap-3 rounded-card bg-surface-alt px-4 py-3.5 text-[12.5px] leading-relaxed"
            >
              {block === "goal-funded" ? (
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              )}
              <span>
                <b className="font-semibold">
                  {block === "goal-funded" ? "Goal funded." : "Paused."}
                </b>{" "}
                {CHALLENGE_TICK_BLOCK_TEXT[block]}
              </span>
            </p>
          )}

          {!block && progress.nextStep !== null && (
            <p className="tabular text-[12.5px] text-muted">
              Next up: {unit} {progress.nextStep + 1} ·{" "}
              {moneyExact(challenge.stepCents[progress.nextStep])} · due{" "}
              {fullDate(stepDueDate(challenge, progress.nextStep))}
            </p>
          )}
        </div>
      </Panel>

      <Panel
        title="Your steps"
        subtitle={`Tick a ${unit} when the money goes in. Tick it again to take it back.`}
      >
        <div className="flex flex-col gap-3">
          <ChallengeGrid
            challenge={challenge}
            progress={progress}
            blocked={block !== null}
            onToggle={(step, done) =>
              done ? uncompleteStep(challenge.id, step) : completeStep(challenge.id, step)
            }
          />
          {progress.adjustedSteps.length > 0 && (
            <p className="text-[11.5px] leading-relaxed text-muted">
              * You edited this amount on {goal ? goal.name : "the goal"}&apos;s
              history. The challenge counts what you actually saved.
            </p>
          )}
        </div>
      </Panel>

      {goal && (
        <Panel title="What it's done for your goal">
          <ChallengeImpactPanel
            impact={challengeImpact(challenge, goal, data.contributions, now)}
            goalName={goal.name}
          />
        </Panel>
      )}

      <Panel title="Manage">
        <div className="flex flex-wrap items-center gap-3">
          {challenge.archivedAt ? (
            <Button variant="secondary" onClick={() => restoreChallenge(challenge.id)}>
              Restore challenge
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => archiveChallenge(challenge.id)}>
              Archive challenge
            </Button>
          )}
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
          <p className="text-[11.5px] leading-relaxed text-muted">
            Archiving keeps every cent on {goal ? goal.name : "the goal"}.
            Deleting takes it back off again.
          </p>
        </div>
      </Panel>

      <DeleteChallengeDialog
        open={confirmDelete}
        name={challenge.name}
        goalName={goal?.name ?? "the goal"}
        savedCents={progress.savedCents}
        onClose={() => setConfirmDelete(false)}
        onArchive={() => {
          archiveChallenge(challenge.id);
          setConfirmDelete(false);
        }}
        onConfirm={() => {
          deleteChallenge(challenge.id);
          setConfirmDelete(false);
          router.push("/challenges");
        }}
      />
    </>
  );
}
