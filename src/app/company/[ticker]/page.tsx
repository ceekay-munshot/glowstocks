import { CompanyView } from "@/components/CompanyView";
import { getBundledReport } from "@/lib/bundledReports";

// The dashboard now lives behind a company route (reached from the landing
// screen via View / Research). Bundled companies (the sample + committed real
// reports) resolve instantly with zero keys; anything else is fetched client-side.
export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ticker } = await params;
  const sp = await searchParams;
  const t = decodeURIComponent(ticker).trim().toUpperCase();
  const initial = getBundledReport(t);
  const autoRun = sp?.run === "1";
  return <CompanyView key={t} ticker={t} initialReport={initial} autoRun={autoRun} />;
}
