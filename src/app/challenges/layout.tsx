import type { Metadata } from "next";

/**
 * The challenge pages are client components, so their title lives here rather
 * than on each page.
 */
export const metadata: Metadata = { title: "Challenges" };

export default function ChallengesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
