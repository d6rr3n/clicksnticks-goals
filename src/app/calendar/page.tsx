import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return <ComingSoon title="Calendar" blurb="Contribution dates, target dates and payday reminders, laid out month by month. Not yet designed." />;
}
