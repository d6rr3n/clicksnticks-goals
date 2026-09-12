"use client";

import Link from "next/link";
import { use } from "react";
import { Skeleton } from "@/components/Skeleton";
import { GoalForm } from "@/components/goals/GoalForm";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { useGoals } from "@/lib/store/GoalsStore";

export default function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hydrated, data } = useGoals();

  if (!hydrated) return <Skeleton />;

  const goal = data.goals.find((g) => g.id === id);
  if (!goal) {
    return (
      <Panel title="Goal not found">
        <p className="mb-4 text-[13px] text-muted">
          This goal may have been deleted.
        </p>
        <ButtonLink href="/goals">Back to all goals</ButtonLink>
      </Panel>
    );
  }

  return (
    <>
      <header className="rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
        <Link
          href={`/goals/${goal.id}`}
          className="inline-flex min-h-[28px] items-center text-[11px] tracking-[0.14em] text-secondary no-underline hover:underline"
        >
          ← {goal.name.toUpperCase()}
        </Link>
        <h1 className="mt-2.5 font-display text-[clamp(28px,4vw,40px)] leading-none font-semibold tracking-tight">
          Edit goal
        </h1>
      </header>

      <GoalForm existing={goal} />
    </>
  );
}
