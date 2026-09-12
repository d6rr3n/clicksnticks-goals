import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Challenges" };

export default function Page() {
  return <ComingSoon title="Challenges" blurb="The 52 Week Challenge is running on the dashboard. The full challenge library — streaks, round-ups and no-spend weeks — is being designed next." />;
}
