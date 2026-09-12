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
    <section className="rounded-panel bg-surface px-6 py-14 text-center elevated">
      <p className="text-[10px] font-medium tracking-[0.2em] text-secondary">
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
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[13px] text-on-primary no-underline transition-colors hover:bg-primary"
      >
        Back to dashboard
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
