"use client";

import { useMemo, useRef, useState } from "react";
import type { PortfolioForecast } from "@/lib/calc";
import { money } from "@/lib/money";
import { monthYear } from "@/lib/dates";

/**
 * The portfolio forecast, month by month, with a marker where each goal lands.
 *
 * Inspecting a date is a readout, not a control panel: move the pointer, or
 * focus the chart and use the arrow keys. The answer is written above the
 * chart in an aria-live region so it is spoken as well as drawn.
 */

const W = 720;
const H = 300;
const PLOT = { left: 64, right: 702, top: 18, bottom: 224 };

function niceMax(value: number): number {
  if (value <= 0) return 100_00;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 5, 7.5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

const shortMoney = (cents: number): string => {
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1000) return `$${Math.round(d / 1000)}K`;
  return `$${Math.round(d)}`;
};

export function ForecastTimeline({ forecast }: { forecast: PortfolioForecast }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const { months, milestones } = forecast;
  const last = months[months.length - 1];

  const max = useMemo(
    () => niceMax(Math.max(...months.map((m) => m.valueCents), 1)),
    [months],
  );

  const x = (month: number) =>
    PLOT.left + (month / Math.max(months.length - 1, 1)) * (PLOT.right - PLOT.left);
  const y = (cents: number) =>
    PLOT.bottom - (cents / max) * (PLOT.bottom - PLOT.top);

  const path = useMemo(
    () => `M${months.map((m) => `${x(m.month).toFixed(2)} ${y(m.valueCents).toFixed(2)}`).join(" L")}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [months, max],
  );

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  // One label per year, and never so many that they collide.
  const yearMarks = months.filter(
    (m) => m.month % (months.length > 72 ? 24 : 12) === 0,
  );

  /**
   * Milestones that would overlap are thinned rather than stacked — a legible
   * subset beats an unreadable complete set.
   */
  const shownMilestones = useMemo(() => {
    const out: typeof milestones = [];
    // Goals already funded landed before this chart begins — they are history,
    // not a milestone ahead.
    for (const ms of milestones.filter((m) => m.month > 0)) {
      const tooClose = out.some((o) => Math.abs(x(o.month) - x(ms.month)) < 78);
      if (!tooClose) out.push(ms);
    }
    return out.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, months.length]);

  const point = selected === null ? null : months[Math.min(selected, months.length - 1)];
  const landedBy = point
    ? milestones.filter((m) => m.month <= point.month).map((m) => m.name)
    : [];

  function onPointer(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const svgX = ratio * W;
    const month = Math.round(
      ((svgX - PLOT.left) / (PLOT.right - PLOT.left)) * (months.length - 1),
    );
    setSelected(Math.min(Math.max(month, 0), months.length - 1));
  }

  function onKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    const step = event.shiftKey ? 12 : 1;
    const current = selected ?? 0;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = current + step;
    else if (event.key === "ArrowLeft") next = current - step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = months.length - 1;
    else if (event.key === "Escape") {
      setSelected(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setSelected(Math.min(Math.max(next, 0), months.length - 1));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The answer, in words, above the drawing. */}
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[44px] flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card bg-surface-alt px-4 py-2.5"
      >
        {point ? (
          <>
            <span className="tabular font-display text-[22px] font-semibold">
              {money(point.valueCents)}
            </span>
            <span className="text-[12.5px] text-muted">
              projected by {monthYear(point.date)}
            </span>
            {landedBy.length > 0 && (
              <span className="text-[12px] text-secondary">
                {landedBy.length === 1
                  ? `${landedBy[0]} funded by then`
                  : `${landedBy.length} goals funded by then`}
              </span>
            )}
          </>
        ) : (
          <span className="text-[12.5px] text-muted">
            Hover the chart — or focus it and use the arrow keys — to read the
            projection at any date.
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full min-w-[340px] touch-none"
          role="img"
          tabIndex={0}
          aria-label={`Portfolio forecast from ${money(months[0].valueCents)} today to ${money(last.valueCents)} by ${monthYear(last.date)}. Use the arrow keys to inspect a date.`}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setSelected(null)}
          onKeyDown={onKeyDown}
        >
          <defs>
            <linearGradient id="timeline-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--edition-secondary)" stopOpacity="0.38" />
              <stop offset="1" stopColor="var(--edition-secondary)" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <g stroke="var(--edition-border)" strokeWidth="1">
            {ticks.map((t) => (
              <line key={t} x1={PLOT.left} y1={y(t)} x2={PLOT.right} y2={y(t)} />
            ))}
          </g>

          <g fill="var(--edition-text-muted)" fontSize="10.5" textAnchor="end" className="font-sans">
            {ticks.map((t) => (
              <text key={t} x={PLOT.left - 9} y={y(t) + 4}>
                {shortMoney(t)}
              </text>
            ))}
          </g>

          <path d={`${path} L${PLOT.right} ${PLOT.bottom} L${PLOT.left} ${PLOT.bottom} Z`} fill="url(#timeline-area)" />
          <path
            d={path}
            fill="none"
            stroke="var(--edition-secondary)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Where each goal lands. */}
          {shownMilestones.map((ms, i) => (
            <g key={ms.goalId}>
              <line
                x1={x(ms.month)}
                y1={y(ms.valueCents)}
                x2={x(ms.month)}
                y2={PLOT.bottom}
                stroke="var(--edition-accent)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <circle cx={x(ms.month)} cy={y(ms.valueCents)} r="4.5" fill="var(--edition-accent)" />
              <text
                x={x(ms.month)}
                y={PLOT.bottom + (i % 2 === 0 ? 40 : 56)}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--edition-accent)"
                className="font-sans"
              >
                {ms.name}
              </text>
              <text
                x={x(ms.month)}
                y={PLOT.bottom + (i % 2 === 0 ? 52 : 68)}
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--edition-text-muted)"
                className="font-sans"
              >
                {monthYear(ms.date)}
              </text>
            </g>
          ))}

          {/* Year ruler. */}
          <g fill="var(--edition-text-muted)" fontSize="10.5" textAnchor="middle" className="font-sans">
            {yearMarks.map((m) => (
              <text key={m.month} x={x(m.month)} y={PLOT.bottom + 20}>
                {m.date.slice(0, 4)}
              </text>
            ))}
          </g>

          {/* The scrubber. */}
          {point && (
            <g>
              <line
                x1={x(point.month)}
                y1={PLOT.top}
                x2={x(point.month)}
                y2={PLOT.bottom}
                stroke="var(--edition-primary)"
                strokeWidth="1.2"
                opacity="0.55"
              />
              <circle
                cx={x(point.month)}
                cy={y(point.valueCents)}
                r="6"
                fill="var(--edition-surface)"
                stroke="var(--edition-primary)"
                strokeWidth="2.5"
              />
            </g>
          )}

          <circle cx={x(0)} cy={y(months[0].valueCents)} r="4" fill="var(--edition-primary)" />
        </svg>
      </div>

      <p className="text-[11px] text-muted">
        Projected at current contribution rates. Weekly and fortnightly saving is
        counted at 52 and 26 payments a year.
        {forecast.truncated && " At least one goal runs past the end of this chart."}
      </p>
    </div>
  );
}
