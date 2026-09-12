"use client";

import Link from "next/link";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { GoalForm } from "@/components/goals/GoalForm";
import { useGoals } from "@/lib/store/GoalsStore";

export default function NewGoalPage() {
  const { mode, hydrated } = useGoals();

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  return (
    <>
      <header className="rounded-panel bg-gradient-to-br from-[#F6F2EC] via-[#E9EEE8] to-[#D6E0D8] px-6 pt-6 pb-7">
        <Link
          href="/goals"
          className="text-[11px] tracking-[0.14em] text-sage-deep no-underline hover:underline"
        >
          ← MY GOALS
        </Link>
        <h1 className="mt-2.5 font-display text-[clamp(28px,4vw,40px)] leading-none font-semibold tracking-tight">
          What are you saving for?
        </h1>
        <p className="mt-2 max-w-[48ch] text-[13px] leading-relaxed text-muted">
          Name it, put a number on it, and pick a date. You can change any of it later.
        </p>
      </header>

      <GoalForm />
    </>
  );
}
