import type { Category } from "@/lib/schema";

/**
 * Artwork for a goal, in order of preference:
 *   1. the user's own photograph (rendered over this by GoalImage)
 *   2. a category illustration, drawn here
 *
 * The illustrations are inline SVG drawn from edition tokens, so they theme
 * with the rest of the app, cost no network request, and cannot fail to load.
 * Nothing here carries meaning — status is always stated in words elsewhere.
 */

type Tone = { ground: string; mid: string; near: string; sky: string };

/** Each category gets a distinct depth of the palette, not a distinct hue. */
const TONES: Record<Category, Tone> = {
  house: { sky: "var(--edition-tint-soft)", ground: "var(--edition-secondary)", mid: "var(--edition-tint)", near: "var(--edition-primary)" },
  travel: { sky: "var(--edition-warm-soft)", ground: "var(--edition-accent)", mid: "var(--edition-accent-soft)", near: "var(--edition-primary)" },
  car: { sky: "var(--edition-warm-soft)", ground: "var(--edition-accent-soft)", mid: "var(--edition-warm)", near: "var(--edition-secondary)" },
  wedding: { sky: "var(--edition-warm-soft)", ground: "var(--edition-tint)", mid: "var(--edition-warm)", near: "var(--edition-secondary)" },
  baby: { sky: "var(--edition-tint-soft)", ground: "var(--edition-warm)", mid: "var(--edition-tint)", near: "var(--edition-secondary)" },
  emergency: { sky: "var(--edition-tint-soft)", ground: "var(--edition-tint)", mid: "var(--edition-secondary)", near: "var(--edition-primary)" },
  education: { sky: "var(--edition-warm-soft)", ground: "var(--edition-tint)", mid: "var(--edition-secondary)", near: "var(--edition-primary)" },
  business: { sky: "var(--edition-tint-soft)", ground: "var(--edition-secondary)", mid: "var(--edition-tint)", near: "var(--edition-primary)" },
  christmas: { sky: "var(--edition-tint-soft)", ground: "var(--edition-secondary)", mid: "var(--edition-tint)", near: "var(--edition-primary)" },
  custom: { sky: "var(--edition-tint-soft)", ground: "var(--edition-tint)", mid: "var(--edition-secondary)", near: "var(--edition-primary)" },
};

/** A sprig, reused across scenes so the set reads as one hand. */
function Sprig({ x, y, scale = 1, tone }: { x: number; y: number; scale?: number; tone: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={tone}>
      <path d="M0 0C0 -6 0 -14 0 -22" stroke={tone} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="-4.2" cy="-6" rx="4.2" ry="2.4" transform="rotate(-28 -4.2 -6)" />
      <ellipse cx="4.2" cy="-10" rx="4.2" ry="2.4" transform="rotate(28 4.2 -10)" />
      <ellipse cx="-3.6" cy="-15" rx="3.6" ry="2.1" transform="rotate(-32 -3.6 -15)" />
      <ellipse cx="3.2" cy="-19.5" rx="3.2" ry="1.9" transform="rotate(32 3.2 -19.5)" />
    </g>
  );
}

function Scene({ category, tone }: { category: Category; tone: Tone }) {
  switch (category) {
    case "house":
      return (
        <>
          <path d="M0 74 L38 74 L38 52 L58 38 L78 52 L78 74 L160 74 L160 104 L0 104 Z" fill={tone.ground} />
          <path d="M30 54 L58 33 L86 54 Z" fill={tone.near} />
          <rect x="50" y="58" width="16" height="16" rx="2" fill={tone.sky} opacity="0.85" />
          <Sprig x={104} y={78} scale={1.15} tone={tone.near} />
          <Sprig x={126} y={80} scale={0.9} tone={tone.mid} />
          <Sprig x={22} y={80} scale={0.8} tone={tone.mid} />
        </>
      );
    case "travel":
      return (
        <>
          <circle cx="116" cy="34" r="15" fill={tone.mid} opacity="0.9" />
          <path d="M0 86 L34 54 L60 82 L84 60 L120 96 L160 70 L160 104 L0 104 Z" fill={tone.ground} />
          <path d="M0 96 L40 76 L74 98 L110 82 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={22} y={92} scale={0.85} tone={tone.near} />
          <Sprig x={140} y={94} scale={0.7} tone={tone.near} />
        </>
      );
    case "car":
      return (
        <>
          <circle cx="34" cy="32" r="13" fill={tone.mid} opacity="0.85" />
          <path d="M0 76 C36 60 62 84 96 70 C124 58 142 74 160 66 L160 104 L0 104 Z" fill={tone.ground} />
          <path d="M0 92 C40 82 70 100 104 90 C132 82 146 94 160 88 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={130} y={86} scale={0.95} tone={tone.near} />
          <Sprig x={16} y={90} scale={0.75} tone={tone.near} />
        </>
      );
    case "wedding":
      return (
        <>
          <path d="M46 96 C40 58 66 34 80 34 C94 34 120 58 114 96" fill="none" stroke={tone.ground} strokeWidth="5" strokeLinecap="round" />
          <circle cx="80" cy="34" r="4" fill={tone.near} />
          <path d="M0 88 C40 78 66 96 104 86 C132 78 146 92 160 86 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={54} y={78} scale={0.8} tone={tone.mid} />
          <Sprig x={106} y={78} scale={0.8} tone={tone.mid} />
        </>
      );
    case "baby":
      return (
        <>
          <path d="M92 20 A18 18 0 1 0 92 54 A14 14 0 1 1 92 20 Z" fill={tone.mid} />
          <path d="M0 84 C42 72 68 94 106 84 C134 76 146 90 160 84 L160 104 L0 104 Z" fill={tone.ground} />
          <path d="M0 96 C44 88 70 102 108 94 C134 88 148 98 160 94 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={40} y={88} scale={0.95} tone={tone.near} />
        </>
      );
    case "emergency":
      return (
        <>
          <ellipse cx="74" cy="88" rx="30" ry="7" fill={tone.mid} />
          <ellipse cx="74" cy="76" rx="24" ry="6" fill={tone.ground} />
          <ellipse cx="74" cy="65" rx="18" ry="5.5" fill={tone.near} />
          <ellipse cx="74" cy="55" rx="12" ry="4.5" fill={tone.ground} />
          <ellipse cx="74" cy="47" rx="7" ry="3.4" fill={tone.near} />
          <path d="M0 96 C40 88 70 102 108 94 C134 88 148 98 160 94 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={126} y={92} scale={0.9} tone={tone.ground} />
          <Sprig x={26} y={94} scale={0.75} tone={tone.ground} />
        </>
      );
    case "education":
      return (
        <>
          <path d="M44 46 L80 56 L80 90 L44 80 Z" fill={tone.ground} />
          <path d="M116 46 L80 56 L80 90 L116 80 Z" fill={tone.near} />
          <path d="M0 94 C44 86 70 100 108 92 C134 86 148 96 160 92 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={28} y={90} scale={0.85} tone={tone.mid} />
          <Sprig x={132} y={90} scale={0.85} tone={tone.mid} />
        </>
      );
    case "christmas":
      return (
        <>
          <path d="M80 26 L98 56 L86 56 L104 84 L56 84 L74 56 L62 56 Z" fill={tone.ground} />
          <rect x="76" y="84" width="8" height="10" rx="1" fill={tone.near} />
          <path d="M0 94 C44 86 70 100 108 92 C134 86 148 96 160 92 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={28} y={92} scale={0.8} tone={tone.mid} />
          <Sprig x={132} y={92} scale={0.8} tone={tone.mid} />
        </>
      );
    case "business":
    case "custom":
    default:
      return (
        <>
          <path d="M0 88 C42 76 68 96 106 86 C134 78 146 92 160 86 L160 104 L0 104 Z" fill={tone.ground} />
          <path d="M0 98 C44 90 70 102 108 96 C134 92 148 100 160 96 L160 104 L0 104 Z" fill={tone.near} />
          <Sprig x={58} y={86} scale={1.25} tone={tone.near} />
          <Sprig x={92} y={90} scale={1} tone={tone.mid} />
          <Sprig x={26} y={92} scale={0.8} tone={tone.mid} />
        </>
      );
  }
}

export function GoalArtwork({
  category,
  className = "",
}: {
  category: Category;
  className?: string;
}) {
  const tone = TONES[category] ?? TONES.custom;
  return (
    <svg
      viewBox="0 0 160 104"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      className={`block h-full w-full ${className}`}
    >
      <rect width="160" height="104" fill={tone.sky} />
      <Scene category={category} tone={tone} />
    </svg>
  );
}
