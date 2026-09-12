import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusChip } from "@/components/ui/StatusChip";
import { ArrowRightIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { contributionsFor, getGoal, goals } from "@/lib/data";
import { dayMonth, money, monthYear, percent, signedMoney } from "@/lib/format";
import { expectedProgress, progressOf, remainingOf, statusOf } from "@/lib/goals";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return goals.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const goal = getGoal((await params).id);
  return { title: goal?.name ?? "Goal not found" };
}

export default async function GoalDetailPage({ params }: Params) {
  const goal = getGoal((await params).id);
  if (!goal) notFound();

  const status = statusOf(goal);
  const progress = progressOf(goal);
  const expected = expectedProgress(goal);
  const history = contributionsFor(goal.id);
  const gap = progress - expected;

  return (
    <>
      <header
        className={`relative overflow-hidden rounded-panel bg-gradient-to-br ${goal.thumb} px-6 pt-6 pb-7`}
      >
        <div aria-hidden className="absolute inset-0 bg-sidebar/35" />
        <div className="relative">
          <Link
            href="/goals"
            className="text-[11px] tracking-[0.14em] text-brand-cream/85 no-underline hover:text-brand-cream hover:underline"
          >
            ← MY GOALS
          </Link>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-none font-semibold text-brand-cream">
              {goal.name}
            </h1>
            <StatusChip status={status} />
          </div>
          <p className="mt-2.5 max-w-[46ch] text-[13px] leading-relaxed text-brand-cream/85">
            {goal.blurb}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Progress">
          <div className="flex flex-col gap-4">
            <p className="tabular font-display text-[34px] leading-none font-semibold">
              {money(goal.saved)}
              <span className="text-lg font-normal text-muted"> / {money(goal.target)}</span>
            </p>

            <ProgressBar fraction={progress} status={status} label={`${goal.name} progress`} />

            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {[
                { t: "Still to go", v: money(remainingOf(goal)) },
                { t: "Target date", v: monthYear(goal.targetDate) },
                { t: "Opened", v: monthYear(goal.startDate) },
                { t: "Expected by now", v: percent(expected) },
              ].map((d) => (
                <div key={d.t}>
                  <dt className="text-[9.5px] font-medium tracking-[0.14em] text-muted">
                    {d.t.toUpperCase()}
                  </dt>
                  <dd className="tabular m-0 mt-1 text-[15px] font-medium">{d.v}</dd>
                </div>
              ))}
            </dl>

            {/* Says *why* the status is what it is, rather than just asserting it. */}
            <p
              className={`rounded-card px-4 py-3 text-[12.5px] leading-relaxed ${
                status === "behind"
                  ? "bg-[#F3E6DA] text-clay"
                  : "bg-rose-light/60 text-rose-deeper"
              }`}
            >
              {status === "complete" ? (
                <>Fully funded — nothing more needed here.</>
              ) : status === "behind" ? (
                <>
                  Tracking <b>{percent(Math.abs(gap))}</b> behind the pace this
                  timeline needs. Lifting contributions now costs less than
                  catching up later.
                </>
              ) : (
                <>
                  Running <b>{percent(Math.abs(gap))}</b> ahead of the pace this
                  timeline needs. Keep going.
                </>
              )}
            </p>
          </div>
        </Panel>

        <Panel title="Contributions" subtitle={`${history.length} recorded`}>
          {history.length === 0 ? (
            <p className="text-[12.5px] text-muted">
              No contributions logged yet. The first one is the hard one.
            </p>
          ) : (
            <ul className="flex list-none flex-col p-0">
              {history.map((c) => {
                const deposit = c.amount > 0;
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-0 last:pb-0"
                  >
                    <span
                      className={`grid h-[29px] w-[29px] shrink-0 place-items-center rounded-full ${
                        deposit ? "bg-rose-light" : "bg-[#EFE0D4]"
                      }`}
                    >
                      {deposit ? (
                        <PlusIcon className="h-3.5 w-3.5 text-rose-deeper" />
                      ) : (
                        <MinusIcon className="h-3.5 w-3.5 text-clay" />
                      )}
                    </span>
                    <span
                      className={`tabular flex-1 text-[13.5px] font-medium ${deposit ? "" : "text-clay"}`}
                    >
                      {signedMoney(c.amount)}
                    </span>
                    <span className="tabular text-[11.5px] text-muted">
                      {dayMonth(c.date)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/goals"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-sidebar px-5 py-3 text-[13px] text-brand-cream no-underline transition-colors hover:bg-rose-deeper"
          >
            Back to all goals
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </Panel>
      </section>
    </>
  );
}
