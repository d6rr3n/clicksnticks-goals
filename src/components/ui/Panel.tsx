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
      className={`rounded-panel bg-surface p-5 shadow-[0_1px_2px_rgba(36,28,27,.05),0_8px_24px_-12px_rgba(36,28,27,.18)] ${className}`}
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
              className="inline-flex shrink-0 items-center gap-1.5 text-xs text-sage-deep no-underline hover:text-forest hover:underline"
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
