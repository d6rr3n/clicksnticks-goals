/** Line icons drawn at a single stroke weight so the set reads as one family. */
type IconProps = { className?: string };

const base = (className?: string) =>
  `stroke-current fill-none ${className ?? "w-4 h-4"}`;

const S = { strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

export const TargetIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

export const TrophyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z" />
    <path d="M6 6H3.5v1.5A3.5 3.5 0 0 0 6 10.8M18 6h2.5v1.5A3.5 3.5 0 0 1 18 10.8" />
  </svg>
);

export const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const ChartIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M5 20V11M12 20V5M19 20v-6" />
  </svg>
);

export const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
  </svg>
);

export const PiggyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M4 12a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v4a2 2 0 0 1-2 2h-1v-2H7v2H6a2 2 0 0 1-2-2z" />
    <circle cx="16.5" cy="12" r="0.8" />
  </svg>
);

export const CoinsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} strokeWidth={2.4}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 13l4 4 10-10" />
  </svg>
);

export const AlertIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16.2v.01" />
  </svg>
);

export const FlagIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M5 21V4h9l-1 3h6v8h-7l-1-3H5" />
  </svg>
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} strokeWidth={2.4}
       strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} strokeWidth={2.4}
       strokeLinecap="round" aria-hidden>
    <path d="M5 12h14" />
  </svg>
);

export const HeartIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
  </svg>
);

export const SparkIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 16.8v.01" />
  </svg>
);

export const TrendIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
    <path d="M15 6h6v6" />
  </svg>
);

export const FlagPinIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} {...S} aria-hidden>
    <path d="M6 21V4" />
    <path d="M6 5h11l-2 3.5L17 12H6" />
  </svg>
);
