import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-forest text-cream hover:bg-sage-deep",
  secondary: "bg-surface text-forest border border-line hover:bg-canvas",
  ghost: "text-sage-deep hover:bg-sage-light/40",
  danger: "bg-terracotta-deep text-cream hover:bg-terracotta",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANT[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  children,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT[variant]} ${className}`}>
      {children}
    </Link>
  );
}
