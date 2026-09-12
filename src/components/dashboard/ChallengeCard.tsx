import { challenge } from "@/lib/data";
import { money } from "@/lib/format";
import { ProgressBar } from "../ui/ProgressBar";

export function ChallengeCard() {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-canvas p-3">
      <div className="grid h-[74px] w-[74px] shrink-0 place-content-center rounded-xl bg-gradient-to-br from-rose-deep to-rose-deeper p-1.5 text-center leading-tight text-[#FFF6F3]">
        <b className="font-display text-2xl font-semibold">{challenge.totalWeeks}</b>
        <span className="text-[8.5px] tracking-[0.1em]">
          WEEK
          <br />
          CHALLENGE
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="tabular text-xs text-muted">
          Week {challenge.week} of {challenge.totalWeeks}
        </p>
        <p className="tabular text-[15.5px] font-medium">
          {money(challenge.saved)}{" "}
          <span className="text-xs font-normal text-muted">
            / {money(challenge.target)}
          </span>
        </p>
        <ProgressBar
          fraction={challenge.saved / challenge.target}
          status="on-track"
          label="52 Week Challenge progress"
        />
      </div>
    </div>
  );
}
