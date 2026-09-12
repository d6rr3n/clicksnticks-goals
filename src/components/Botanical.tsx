/**
 * Botanical decoration. Used sparingly — hero corner, motivation card, empty
 * states and onboarding only. It behaves like the printed flourish on good
 * stationery: always decorative, never a control, never load-bearing.
 */

export function BotanicalCorner({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 180"
      aria-hidden
      focusable="false"
      className={`pointer-events-none select-none ${flip ? "-scale-x-100" : ""} ${className}`}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      >
        <path d="M214 8C168 20 132 44 108 78" />
        <path d="M214 44C180 52 152 70 132 96" />
        <path d="M214 82C192 86 174 96 160 110" />
      </g>
      <g fill="currentColor" opacity="0.42">
        {[
          [186, 26, -34, 1.15],
          [162, 42, -28, 0.95],
          [140, 62, -24, 0.8],
          [190, 60, -40, 0.85],
          [168, 78, -32, 0.7],
          [198, 96, -36, 0.65],
        ].map(([x, y, rot, s], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={13 * s}
            ry={5.2 * s}
            transform={`rotate(${rot} ${x} ${y})`}
          />
        ))}
      </g>
      <g fill="currentColor" opacity="0.3">
        <circle cx="204" cy="18" r="3.4" />
        <circle cx="150" cy="52" r="2.6" />
        <circle cx="178" cy="104" r="2.2" />
      </g>
    </svg>
  );
}

/** A single upright stem, for quiet moments — empty states and quotes. */
export function BotanicalSprig({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 72"
      aria-hidden
      focusable="false"
      className={`pointer-events-none select-none ${className}`}
    >
      <path
        d="M24 70C24 52 24 28 24 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <g fill="currentColor" opacity="0.5">
        {[
          [-1, 54, -30],
          [1, 44, 30],
          [-1, 36, -28],
          [1, 27, 28],
          [-1, 20, -26],
          [1, 13, 26],
        ].map(([side, y, rot], i) => {
          const cx = 24 + side * 8;
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={y}
              rx="8"
              ry="3.2"
              transform={`rotate(${rot} ${cx} ${y})`}
            />
          );
        })}
      </g>
      <circle cx="24" cy="6" r="2.6" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
