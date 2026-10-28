import { Landing } from "@/components/Landing";
import { knownCompanies } from "@/lib/bundledReports";

// The app now opens on a SEARCH-FIRST landing screen (not the dashboard). The
// previous-runs table is built from the committed/bundled reports, so it renders
// with zero keys and zero network calls.
export default function Home() {
  return <Landing companies={knownCompanies()} />;
}
