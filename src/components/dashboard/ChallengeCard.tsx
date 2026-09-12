import { money } from "@/lib/money";
import { ProgressBar } from "../ui/ProgressBar";

/**
 * Static preview. Challenges are a later phase, so this is left as designed
 * rather than half-wired to the goals engine.
 */
const CHALLENGE = {
  totalWeeks: 52,
  week: 36,
  savedCents: 666_00,
  targetCents: 1_378_00,
};

export function ChallengeCard() {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-background p-3">
      <div className="grid h-[74px] w-[74px] shrink-0 place-content-center rounded-xl bg-gradient-to-br from-secondary to-primary p-1.5 text-center leading-tight text-on-primary">
        <b className="font-display text-2xl font-semibold">{CHALLENGE.totalWeeks}</b>
        <span className="text-[8.5px] tracking-[0.1em]">
          WEEK
          <br />
          CHALLENGE
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="tabular text-xs text-muted">
          Week {CHALLENGE.week} of {CHALLENGE.totalWeeks}
        </p>
        <p className="tabular text-[15.5px] font-medium">
          {money(CHALLENGE.savedCents)}{" "}
          <span className="text-xs font-normal text-muted">/ {money(CHALLENGE.targetCents)}</span>
        </p>
        <ProgressBar
          fraction={CHALLENGE.savedCents / CHALLENGE.targetCents}
          status="on-track"
          label="52 Week Challenge progress"
        />
      </div>
    </div>
  );
}
