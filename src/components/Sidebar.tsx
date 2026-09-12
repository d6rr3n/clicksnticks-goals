"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ChartIcon,
  HomeIcon,
  SettingsIcon,
  TargetIcon,
  TrophyIcon,
} from "./icons";

const NAV = [
  { href: "/", label: "Dashboard", Icon: HomeIcon },
  { href: "/goals", label: "My Goals", Icon: TargetIcon },
  { href: "/challenges", label: "Challenges", Icon: TrophyIcon },
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/insights", label: "Insights", Icon: ChartIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex flex-row flex-wrap items-center gap-4 overflow-hidden bg-forest px-4 py-4 text-cream md:flex-col md:items-stretch md:gap-8 md:px-[18px] md:py-7">
      {/* Botanical wash, echoing the florals in the approved mockup. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-40%] bottom-[-12%] hidden h-[46%] md:block"
        style={{
          background:
            "radial-gradient(62% 72% at 28% 100%, rgba(155,103,79,.32), transparent 70%), radial-gradient(54% 64% at 78% 96%, rgba(164,181,175,.26), transparent 72%)",
        }}
      />

      <Link href="/" className="relative z-10 block shrink-0 no-underline">
        <span className="block font-display text-[25px] leading-none font-semibold tracking-tight text-cream">
          Clicks<i className="italic text-sage-light">&apos;n&apos;</i>Ticks
        </span>
        <span className="mt-1 block text-[15px] font-light tracking-[0.34em] text-sage-light">
          GOALS
        </span>
        <span className="my-2 hidden h-px bg-cream/20 md:block" />
        <span className="hidden text-[8.5px] tracking-[0.22em] text-blush md:block">
          PLAN · SAVE · ACHIEVE
        </span>
      </Link>

      <nav aria-label="Main" className="relative z-10 flex flex-1 flex-row flex-wrap gap-0.5 md:flex-col">
        {NAV.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] no-underline transition-colors ${
                active
                  ? "bg-forest-hi text-cream shadow-[inset_2px_0_0_var(--color-sage)]"
                  : "text-cream/80 hover:bg-cream/8 hover:text-cream"
              }`}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="relative z-10 mt-auto hidden font-display text-[27px] leading-[1.16] font-medium italic md:block">
        Big
        <br />
        Goals
        <br />
        Brighter
        <br />
        Days <span className="text-sage">♡</span>
      </p>
    </aside>
  );
}
