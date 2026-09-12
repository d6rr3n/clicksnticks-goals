import Link from "next/link";

export function Panel({
  title,
  subtitle,
  icon,
  action,
  className = "",
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-panel bg-surface p-5 elevated ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-baseline justify-between gap-4">
          {title && (
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold sm:text-[23px]">
              {icon}
              {title}
            </h2>
          )}
          {action && (
            <Link
              href={action.href}
              className="inline-flex min-h-[24px] shrink-0 items-center gap-1.5 text-xs text-secondary no-underline hover:text-primary hover:underline"
            >
              {action.label} →
            </Link>
          )}
        </div>
      )}
      {subtitle && <p className="mb-3 -mt-2 text-[11.5px] text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}
