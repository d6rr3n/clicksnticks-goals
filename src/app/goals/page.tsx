import type { Metadata } from "next";
import { GoalCard } from "@/components/GoalCard";
import { Panel } from "@/components/ui/Panel";
import { goals, totalSaved } from "@/lib/data";
import { remainingOf, statusOf } from "@/lib/goals";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "My Goals" };

export default function GoalsPage() {
  const behind = goals.filter((g) => statusOf(g) === "behind");
  const stillToSave = goals.reduce((sum, g) => sum + remainingOf(g), 0);

  return (
    <>
      <header className="rounded-panel bg-gradient-to-br from-[#FBF6F1] via-[#F6E7E1] to-[#EFD3CB] px-6 pt-6 pb-7">
        <p className="text-[10px] font-medium tracking-[0.2em] text-sage-deep">
          EVERY GOAL, ALL IN ONE PLACE
        </p>
        <h1 className="my-2 font-display text-[clamp(28px,4vw,40px)] leading-none font-semibold tracking-tight">
          My Goals
        </h1>
        <p className="tabular text-[13px] text-muted">
          {money(totalSaved)} saved · {money(stillToSave)} still to go
          {behind.length > 0 && (
            <>
              {" · "}
              <span className="font-medium text-terracotta-deep">
                {behind.length} needing attention
              </span>
            </>
          )}
        </p>
      </header>

      <Panel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </Panel>
    </>
  );
}
