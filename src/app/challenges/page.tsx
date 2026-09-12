"use client";

import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { BotanicalCorner, BotanicalSprig } from "@/components/Botanical";
import { ChallengeListCard } from "@/components/challenges/ChallengeListCard";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PlusIcon } from "@/components/icons";
import { useGoals } from "@/lib/store/GoalsStore";
import { activeChallenges } from "@/lib/challenges";

export default function ChallengesPage() {
  const { mode, hydrated, data } = useGoals();

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  const active = activeChallenges(data.challenges);
  const archived = data.challenges.filter((c) => c.archivedAt);
  const goalFor = (goalId: string) => data.goals.find((g) => g.id === goalId);

  return (
    <>
      <StoreNotices />

      <header className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
        <BotanicalCorner className="absolute -top-6 right-0 h-[150%] w-auto text-primary opacity-70" />
        <div className="relative">
          <h1 className="mt-2 mb-2 font-display text-[clamp(28px,4vw,42px)] leading-none font-semibold tracking-tight">
            Challenges
          </h1>
          <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
            A small, regular habit pointed at one real goal. Every step you tick
            is an ordinary contribution — it lands on the goal, in your history,
            and in the forecast.
          </p>
        </div>
      </header>

      {active.length === 0 && archived.length === 0 ? (
        <Panel title="Nothing running yet">
          <div className="flex flex-col items-start gap-4 py-6">
            <BotanicalSprig className="h-20 w-auto text-secondary opacity-35" />
            <p className="max-w-[48ch] text-[13.5px] leading-relaxed text-muted">
              A challenge turns a big number into fifty-two small ones. Pick a
              goal and we&apos;ll work out the steps.
            </p>
            <ButtonLink href="/challenges/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Start a challenge
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/challenges/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Start a challenge
            </ButtonLink>
          </div>

          {active.length > 0 && (
            <Panel title="Running">
              <ul className="flex list-none flex-col gap-3 p-0">
                {active.map((challenge) => (
                  <ChallengeListCard
                    key={challenge.id}
                    challenge={challenge}
                    goal={goalFor(challenge.goalId)}
                    contributions={data.contributions}
                  />
                ))}
              </ul>
            </Panel>
          )}

          {archived.length > 0 && (
            <Panel
              title="Archived"
              subtitle="Put away, with every cent still on the goal."
            >
              <ul className="flex list-none flex-col gap-3 p-0">
                {archived.map((challenge) => (
                  <ChallengeListCard
                    key={challenge.id}
                    challenge={challenge}
                    goal={goalFor(challenge.goalId)}
                    contributions={data.contributions}
                  />
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
