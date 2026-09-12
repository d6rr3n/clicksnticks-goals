"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { BotanicalCorner, BotanicalSprig } from "@/components/Botanical";
import { WhatIfSimulator } from "@/components/whatif/WhatIfSimulator";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PlusIcon } from "@/components/icons";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import { isComplete } from "@/lib/calc";

function WhatIfContent() {
  const { mode, hydrated, data } = useGoals();
  const now = useNow();
  const params = useSearchParams();

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  const live = data.goals.filter((g) => !g.archivedAt);
  const unfinished = live.filter((g) => !isComplete(g, data.contributions));
  const selectable = unfinished.length > 0 ? unfinished : live;

  return (
    <>
      <StoreNotices />

      <header className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
        <BotanicalCorner className="absolute -top-6 right-0 h-[150%] w-auto text-primary opacity-70" />
        <div className="relative">
          <Link
            href="/forecast"
            className="inline-flex min-h-[28px] items-center text-[11px] tracking-[0.14em] text-secondary no-underline hover:underline"
          >
            ← FORECAST
          </Link>
          <h1 className="mt-2 mb-2 font-display text-[clamp(28px,4vw,42px)] leading-none font-semibold tracking-tight">
            What If?
          </h1>
          <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
            Small changes, played out. Nothing here touches your goals until you
            choose to apply it.
          </p>
        </div>
      </header>

      {selectable.length === 0 ? (
        <Panel title="Nothing to explore yet">
          <div className="flex flex-col items-start gap-4 py-6">
            <BotanicalSprig className="h-20 w-auto text-secondary opacity-35" />
            <p className="max-w-[48ch] text-[13.5px] leading-relaxed text-muted">
              Add a goal and you can try saving a little more, dropping in a lump
              sum, or working backwards from a date you have in mind.
            </p>
            <ButtonLink href="/goals/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Create a goal
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <WhatIfSimulator
          goals={selectable}
          contributions={data.contributions}
          now={now}
          initialGoalId={params.get("goal") ?? undefined}
        />
      )}
    </>
  );
}

export default function WhatIfPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <WhatIfContent />
    </Suspense>
  );
}
