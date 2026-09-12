import { forecast } from "@/lib/data";
import { money } from "@/lib/format";

/** One scale places every mark, tick and label. */
const W = 560;
const PLOT = { left: 54, right: 540, top: 16, bottom: 176 };
const MAX = 100_000;
const TICKS = [0, 25_000, 50_000, 75_000, 100_000];

const x = (i: number) =>
  PLOT.left + (i * (PLOT.right - PLOT.left)) / (forecast.length - 1);
const y = (v: number) =>
  PLOT.bottom - (v / MAX) * (PLOT.bottom - PLOT.top);

export function ForecastChart() {
  const pts = forecast.map((p, i) => `${x(i)} ${y(p.value)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${PLOT.right} ${PLOT.bottom} L${PLOT.left} ${PLOT.bottom} Z`;
  const last = forecast[forecast.length - 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} 224`}
        className="block h-auto w-full min-w-[300px]"
        role="img"
        aria-label={`Savings forecast rising from ${money(forecast[0].value)} in ${forecast[0].year} to ${money(last.value)} in ${last.year}`}
      >
        <defs>
          <linearGradient id="forecast-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-sage)" stopOpacity="0.52" />
            <stop offset="1" stopColor="var(--color-sage)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <g stroke="var(--color-line)" strokeWidth="1">
          {TICKS.map((t) => (
            <line key={t} x1={PLOT.left} y1={y(t)} x2={PLOT.right} y2={y(t)} />
          ))}
        </g>

        <g fill="var(--color-muted)" fontSize="10" textAnchor="end" className="font-sans">
          {TICKS.map((t) => (
            <text key={t} x={PLOT.left - 8} y={y(t) + 4}>
              {t === 0 ? "$0" : `$${t / 1000}K`}
            </text>
          ))}
        </g>

        <path d={area} fill="url(#forecast-area)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-sage-deep)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {forecast.map((p, i) =>
          i === forecast.length - 1 ? null : (
            <circle
              key={p.year}
              cx={x(i)}
              cy={y(p.value)}
              r="3.4"
              fill="var(--color-surface)"
              stroke="var(--color-sage-deep)"
              strokeWidth="2"
            />
          ),
        )}
        <circle
          cx={x(forecast.length - 1)}
          cy={y(last.value)}
          r="5"
          fill="var(--color-forest)"
        />

        <g fill="var(--color-muted)" fontSize="10" textAnchor="middle" className="font-sans">
          {forecast.map((p, i) => (
            <text key={p.year} x={x(i)} y={PLOT.bottom + 20}>
              {p.year}
            </text>
          ))}
        </g>

        <g transform={`translate(${PLOT.right - 88},0)`}>
          <rect width="88" height="23" rx="11.5" fill="var(--color-forest)" />
          <text
            x="44"
            y="15.5"
            fill="var(--color-cream)"
            fontSize="12"
            textAnchor="middle"
            className="font-sans"
          >
            {money(last.value)}
          </text>
        </g>

        <text x={PLOT.left} y="216" fill="var(--color-muted)" fontSize="9.5" className="font-sans">
          Projected at current contribution rate
        </text>
      </svg>
    </div>
  );
}
