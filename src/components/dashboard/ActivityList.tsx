import { contributions, getGoal } from "@/lib/data";
import { dayMonth, signedMoney } from "@/lib/format";
import { MinusIcon, PlusIcon } from "../icons";

export function ActivityList({ limit = 4 }: { limit?: number }) {
  return (
    <ul className="flex list-none flex-col p-0">
      {contributions.slice(0, limit).map((c) => {
        const deposit = c.amount > 0;
        const name =
          c.goalId === "general" ? "General Savings" : getGoal(c.goalId)?.name;
        return (
          <li
            key={c.id}
            className="flex items-center gap-3 border-b border-line py-2.5 last:border-0 last:pb-0"
          >
            <span
              className={`grid h-[29px] w-[29px] shrink-0 place-items-center rounded-full ${
                deposit ? "bg-sage-light" : "bg-blush"
              }`}
            >
              {deposit ? (
                <PlusIcon className="h-3.5 w-3.5 text-forest" />
              ) : (
                <MinusIcon className="h-3.5 w-3.5 text-terracotta-deep" />
              )}
            </span>
            <span
              className={`tabular min-w-[52px] text-[13.5px] font-medium ${
                deposit ? "" : "text-terracotta-deep"
              }`}
            >
              {signedMoney(c.amount)}
            </span>
            <span className="flex-1 truncate text-[12.5px] text-muted">{name}</span>
            <span className="tabular shrink-0 text-[11.5px] text-muted">
              {dayMonth(c.date)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
