"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { ContributionHistory } from "@/components/contributions/ContributionHistory";
import { QuickAdd } from "@/components/contributions/QuickAdd";
import { GoalImage } from "@/components/goals/GoalImage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusChip } from "@/components/ui/StatusChip";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import {
  balanceCents,
  monthlyRateCents,
  monthsRemaining,
  paceGap,
  percentComplete,
  projectedCompletion,
  remainingCents,
  statusOf,
} from "@/lib/calc";
import { money } from "@/lib/money";
import { fullDate, monthYear } from "@/lib/dates";
import { CATEGORY_LABEL, FREQUENCY_LABEL, PRIORITY_LABEL } from "@/lib/schema";

const FALLBACK_THUMB = "from-[#B9C4BB] via-[#7E8F82] to-[#4F6157]";

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { hydrated, data, archiveGoal, restoreGoal, deleteGoal } = useGoals();
  const now = useNow();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!hydrated) return <Skeleton />;

  const goal = data.goals.find((g) => g.id === id);
  if (!goal) {
    return (
      <Panel title="Goal not found">
        <p className="mb-4 text-[13px] leading-relaxed text-muted">
          This goal may have been deleted, or the link may be out of date.
        </p>
        <ButtonLink href="/goals">Back to all goals</ButtonLink>
      </Panel>
    );
  }

  const contributions = data.contributions;
  const status = statusOf(goal, contributions, now);
  const balance = balanceCents(goal, contributions);
  const progress = percentComplete(goal, contributions);
  const gap = paceGap(goal, contributions, now);
  const projected = projectedCompletion(goal, contributions, now);
  const months = monthsRemaining(goal, contributions);
  const category =
    goal.category === "custom" && goal.customCategory
      ? goal.customCategory
      : CATEGORY_LABEL[goal.category];

  return (
    <>
      <StoreNotices />

      <header
        className={`relative overflow-hidden rounded-panel bg-gradient-to-br ${goal.thumb ?? FALLBACK_THUMB} px-6 pt-6 pb-7`}
      >
        {goal.imageId && (
          <GoalImage
            imageId={goal.imageId}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-forest/45" />
        <div className="relative">
          <Link
            href="/goals"
            className="text-[11px] tracking-[0.14em] text-cream/85 no-underline hover:text-cream hover:underline"
          >
            ← MY GOALS
          </Link>

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-none font-semibold text-cream">
              {goal.emoji ? `${goal.emoji} ` : ""}
              {goal.name}
            </h1>
            <StatusChip status={status} />
            {goal.archivedAt && (
              <span className="rounded-full bg-cream/20 px-3 py-1 text-[10px] tracking-[0.1em] text-cream">
                ARCHIVED
              </span>
            )}
          </div>

          <p className="mt-2 flex flex-wrap gap-x-3 text-[11px] tracking-[0.1em] text-cream/75">
            <span>{category.toUpperCase()}</span>
            <span aria-hidden>·</span>
            <span>{PRIORITY_LABEL[goal.priority].toUpperCase()} PRIORITY</span>
            <span aria-hidden>·</span>
            <span>
              {money(goal.contributionCents)} {FREQUENCY_LABEL[goal.frequency].toUpperCase()}
            </span>
          </p>

          {goal.notes && (
            <p className="mt-2.5 max-w-[46ch] text-[13px] leading-relaxed text-cream/85">
              {goal.notes}
            </p>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Progress">
          <div className="flex flex-col gap-4">
            <p className="tabular font-display text-[34px] leading-none font-semibold">
              {money(balance)}
              <span className="text-lg font-normal text-muted"> / {money(goal.targetCents)}</span>
            </p>

            <ProgressBar fraction={progress} status={status} label={`${goal.name} progress`} />

            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {[
                { t: "Still to go", v: money(remainingCents(goal, contributions)) },
                { t: "Target date", v: monthYear(goal.targetDate) },
                {
                  t: "Monthly rate",
                  v: monthlyRateCents(goal) > 0 ? money(monthlyRateCents(goal)) : "—",
                },
                {
                  t: "On this plan",
                  v: status === "complete"
                    ? "Complete"
                    : projected
                      ? fullDate(projected.toISOString().slice(0, 10))
                      : "No end date",
                },
              ].map((d) => (
                <div key={d.t}>
                  <dt className="text-[9.5px] font-medium tracking-[0.14em] text-muted">
                    {d.t.toUpperCase()}
                  </dt>
                  <dd className="tabular m-0 mt-1 text-[15px] font-medium">{d.v}</dd>
                </div>
              ))}
            </dl>

            <p
              className={`rounded-card px-4 py-3 text-[12.5px] leading-relaxed ${
                status === "behind"
                  ? "bg-[#F1E4DA] text-terracotta-deep"
                  : "bg-sage-light/60 text-forest"
              }`}
            >
              {status === "complete" ? (
                <>Fully funded — nothing more needed here. The history below stays put.</>
              ) : months === null ? (
                <>
                  No regular contribution is set, so there is no completion date yet.
                  Add one and this fills in.
                </>
              ) : status === "behind" ? (
                <>
                  At {money(monthlyRateCents(goal))} a month this takes{" "}
                  <b>{months} more month{months === 1 ? "" : "s"}</b>, which lands after{" "}
                  {monthYear(goal.targetDate)}. Lifting contributions now costs less than
                  catching up later.
                </>
              ) : (
                <>
                  At {money(monthlyRateCents(goal))} a month this lands in{" "}
                  <b>{months} month{months === 1 ? "" : "s"}</b>, inside the{" "}
                  {monthYear(goal.targetDate)} target
                  {gap > 0.02 && <> — about {Math.round(gap * 100)}% ahead of pace</>}. Keep going.
                </>
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/goals/${goal.id}/edit`} variant="secondary">
                Edit goal
              </ButtonLink>
              {goal.archivedAt ? (
                <Button variant="secondary" onClick={() => restoreGoal(goal.id)}>
                  Restore from archive
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => archiveGoal(goal.id)}>
                  Archive
                </Button>
              )}
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Add a contribution">
          <QuickAdd goals={[goal]} defaultGoalId={goal.id} lockGoal />
        </Panel>
      </section>

      <Panel
        title="Contribution history"
        subtitle="Every change here updates the figures above."
      >
        <ContributionHistory goal={goal} />
      </Panel>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${goal.name}?`}
        description="This removes the goal and its entire contribution history. It cannot be undone. Archiving keeps everything and simply sets it aside."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={() => {
              deleteGoal(goal.id);
              router.push("/goals");
            }}
          >
            Delete permanently
          </Button>
          {!goal.archivedAt && (
            <Button
              variant="secondary"
              onClick={() => {
                archiveGoal(goal.id);
                setConfirmDelete(false);
              }}
            >
              Archive instead
            </Button>
          )}
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
