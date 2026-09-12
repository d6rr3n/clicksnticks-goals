"use client";

import Link from "next/link";
import { use } from "react";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { EditChallengeForm } from "@/components/challenges/EditChallengeForm";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useGoals } from "@/lib/store/GoalsStore";

export default function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { mode, hydrated, data } = useGoals();

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

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

  return (
    <>
      <StoreNotices />

      <header className="flex flex-col gap-2">
        <Link
          href={`/challenges/${challenge.id}`}
          className="inline-flex min-h-[28px] items-center text-[11px] tracking-[0.14em] text-secondary no-underline hover:underline"
        >
          ← {challenge.name.toUpperCase()}
        </Link>
        <h1 className="font-display text-[clamp(26px,4vw,36px)] leading-none font-semibold tracking-tight">
          Edit challenge
        </h1>
      </header>

      <EditChallengeForm challenge={challenge} />
    </>
  );
}
