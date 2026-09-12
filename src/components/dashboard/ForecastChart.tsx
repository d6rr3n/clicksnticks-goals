"use client";

import type { ForecastPoint } from "@/lib/calc";
import { money } from "@/lib/money";

/** One scale places every mark, tick and label. */
const W = 560;
const PLOT = { left: 54, right: 540, top: 16, bottom: 176 };

/** Round the axis up to something a person would choose. */
function niceMax(value: number): number {
  if (value <= 0) return 100_00;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

const shortMoney = (cents: number): string => {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${Math.round(dollars / 1000)}K`;
  return `$${Math.round(dollars)}`;
};

export function ForecastChart({ series }: { series: ForecastPoint[] }) {
  if (series.length < 2) {
    return (
      <p className="text-[12.5px] leading-relaxed text-muted">
        Add a goal with a regular contribution and the forecast will appear here.
      </p>
    );
  }

  const max = niceMax(Math.max(...series.map((p) => p.valueCents)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  const x = (i: number) =>
    PLOT.left + (i * (PLOT.right - PLOT.left)) / (series.length - 1);
  const y = (v: number) => PLOT.bottom - (v / max) * (PLOT.bottom - PLOT.top);

  const pts = series.map((p, i) => `${x(i)} ${y(p.valueCents)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${PLOT.right} ${PLOT.bottom} L${PLOT.left} ${PLOT.bottom} Z`;
  const last = series[series.length - 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} 224`}
        className="block h-auto w-full min-w-[300px]"
        role="img"
        aria-label={`Savings forecast rising from ${money(series[0].valueCents)} in ${series[0].year} to ${money(last.valueCents)} in ${last.year}`}
      >
        <defs>
          <linearGradient id="forecast-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-secondary)" stopOpacity="0.42" />
            <stop offset="1" stopColor="var(--color-secondary)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <g stroke="var(--color-border)" strokeWidth="1">
          {ticks.map((t) => (
            <line key={t} x1={PLOT.left} y1={y(t)} x2={PLOT.right} y2={y(t)} />
          ))}
        </g>

        <g fill="var(--color-text-muted)" fontSize="10" textAnchor="end" className="font-sans">
          {ticks.map((t) => (
            <text key={t} x={PLOT.left - 8} y={y(t) + 4}>
              {shortMoney(t)}
            </text>
          ))}
        </g>

        <path d={area} fill="url(#forecast-area)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {series.slice(0, -1).map((p, i) => (
          <circle
            key={p.year}
            cx={x(i)}
            cy={y(p.valueCents)}
            r="3.4"
            fill="var(--color-surface)"
            stroke="var(--color-secondary)"
            strokeWidth="2"
          />
        ))}
        <circle cx={x(series.length - 1)} cy={y(last.valueCents)} r="5" fill="var(--color-primary)" />

        <g fill="var(--color-text-muted)" fontSize="10" textAnchor="middle" className="font-sans">
          {series.map((p, i) => (
            <text key={p.year} x={x(i)} y={PLOT.bottom + 20}>
              {p.year}
            </text>
          ))}
        </g>

        <g transform={`translate(${PLOT.right - 88},0)`}>
          <rect width="88" height="23" rx="11.5" fill="var(--color-primary)" />
          <text x="44" y="15.5" fill="var(--color-on-primary)" fontSize="12" textAnchor="middle" className="font-sans">
            {money(last.valueCents)}
          </text>
        </g>

        <text x={PLOT.left} y="216" fill="var(--color-text-muted)" fontSize="9.5" className="font-sans">
          Projected at current contribution rates
        </text>
      </svg>
    </div>
  );
}
