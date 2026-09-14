"use client";

import Link from "next/link";
import { Suspense } from "react";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { NewChallengeForm } from "@/components/challenges/NewChallengeForm";
import { useGoals } from "@/lib/store/GoalsStore";

export default function NewChallengePage() {
  const { mode, hydrated } = useGoals();

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

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
          Start a challenge
        </h1>
      </header>

      {/* The form reads ?goal= after a detour to create one. */}
      <Suspense fallback={<Skeleton />}>
        <NewChallengeForm />
      </Suspense>
    </>
  );
}
