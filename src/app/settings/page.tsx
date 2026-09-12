import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <ComingSoon title="Settings" blurb="Accounts, contribution schedules, reminders and the things you would rather not be asked twice. Not yet designed." />;
}
