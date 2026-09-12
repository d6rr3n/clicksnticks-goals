import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Insights" };

export default function Page() {
  return <ComingSoon title="Insights" blurb="Where the money actually goes, which goals are pulling ahead, and what a small change would do over five years. Not yet designed." />;
}
