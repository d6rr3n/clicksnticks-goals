import type { Metadata } from "next";
import { Jost, Playfair_Display } from "next/font/google";
import { AppShell } from "@/components/AppShell";
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

export const metadata: Metadata = {
  title: {
    default: "Clicks'n'Ticks GOALS",
    template: "%s · Clicks'n'Ticks GOALS",
  },
  description: "Plan, save, achieve. A brighter future is a planned one.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" className={`${playfair.variable} ${jost.variable}`}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
