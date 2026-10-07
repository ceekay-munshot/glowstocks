import { Dashboard } from "@/components/Dashboard";
import { getBundledReport, SAMPLE_TICKER } from "@/lib/bundledReports";

// The committed SAMPLE (TCS) is bundled, so the dashboard renders on first paint
// with zero keys and zero network calls — the brief's core requirement.
export default function Home() {
  const sample = getBundledReport(SAMPLE_TICKER);
  return <Dashboard initialReport={sample} />;
}
