import Link from "next/link";
import { ArrowRightIcon } from "./icons";

/** Placeholder for nav sections not yet designed, so links never dead-end. */
export function ComingSoon({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <section className="rounded-panel bg-surface px-6 py-14 text-center shadow-[0_1px_2px_rgba(36,28,27,.05),0_8px_24px_-12px_rgba(36,28,27,.18)]">
      <p className="text-[10px] font-medium tracking-[0.2em] text-sage-deep">
        NEXT UP
      </p>
      <h1 className="mx-auto my-3 max-w-[18ch] font-display text-[clamp(26px,4vw,36px)] leading-tight font-semibold text-balance">
        {title}
      </h1>
      <p className="mx-auto max-w-[46ch] text-[13px] leading-relaxed text-muted">
        {blurb}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-[13px] text-cream no-underline transition-colors hover:bg-forest"
      >
        Back to dashboard
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
