import type { Metadata } from "next";
import { Jost, Playfair_Display } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { GoalsProvider } from "@/lib/store/GoalsStore";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

/**
 * The visual edition. Every colour in the app resolves from this one attribute
 * via the tokens in globals.css — switching it re-themes the product and
 * changes nothing about calculations, storage, navigation or behaviour.
 *
 *   "sage"  — Clicks'n'Ticks GOALS, Sage Edition (the shipping product)
 *   "blush" — the Blush/Rose treatment, preserved for a future edition
 */
const EDITION: "sage" | "blush" = "sage";

export const metadata: Metadata = {
  title: {
    default: "Clicks'n'Ticks GOALS",
    template: "%s · Clicks'n'Ticks GOALS",
  },
  description: "Plan, save, achieve. A brighter future is a planned one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-AU"
      data-edition={EDITION}
      className={`${playfair.variable} ${jost.variable}`}
    >
      <body className="font-sans antialiased">
        <GoalsProvider>
          <AppShell>{children}</AppShell>
        </GoalsProvider>
      </body>
    </html>
  );
}
