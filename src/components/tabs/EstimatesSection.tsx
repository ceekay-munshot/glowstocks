"use client";

import type { CompanyReport } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { Grid, SubHeading } from "./Grid";
import { SourcesFooter } from "./PeersTab";
import { forwardRevenueBarsOption, forwardEpsLineOption } from "@/lib/charts";
import { num, fmtPrice } from "@/lib/format";
import { resolveSources } from "@/lib/export/reportModel";

export function EstimatesSection({ report }: { report: CompanyReport }) {
  const e = report.estimates;
  return (
    <>
      <SubHeading>Street estimates</SubHeading>
      {!e || !e.available ? (
        <Grid>
          <WidgetCard title="Street estimates" category="markets" span={3}>
            <EmptyState title="Not available" hint={e?.summary ?? "No Street estimates found via web research."} />
          </WidgetCard>
        </Grid>
      ) : (
        <Grid>
          <WidgetCard title="Forward revenue" subtitle="Consensus · INR crore" category="markets">
            {e.forward.some((f) => f.revenue?.available) ? <EChart option={forwardRevenueBarsOption(e.forward)} height={240} /> : <EmptyState />}
          </WidgetCard>

          <WidgetCard title="Forward EPS" subtitle="Consensus · INR" category="analytics">
            {e.forward.some((f) => f.eps?.available) ? <EChart option={forwardEpsLineOption(e.forward)} height={240} /> : <EmptyState />}
          </WidgetCard>

          <WidgetCard title="Consensus" subtitle={e.summary} category="markets">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <PriceTargetBar low={num(e.target_low ?? null)} mean={num(e.target_mean ?? null)} high={num(e.target_high ?? null)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <Row label="Rating"><CitedValue c={e.rating ?? null} bold /></Row>
                <Row label="Analysts"><CitedValue c={e.analysts ?? null} bold /></Row>
              </div>
              {e.eps_revision && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>EPS revisions: {e.eps_revision}</div>}
            </div>
          </WidgetCard>

          <WidgetCard title="Forward estimates" subtitle="Hover any figure for its source" category="markets" span={3} bodyPadding={0}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--card-header)" }}>
                  {["Period", "Revenue", "EPS", "Growth"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "right", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.forward.map((f) => (
                  <tr key={f.period} style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <td style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-primary)" }}>{f.period}</td>
                    <td style={cellR}><CitedValue c={f.revenue ?? null} /></td>
                    <td style={cellR}><CitedValue c={f.eps ?? null} /></td>
                    <td style={cellR}><CitedValue c={f.growth ?? null} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SourcesFooter labels={resolveSources(report, ...e.forward.flatMap((f) => [f.revenue ?? null, f.eps ?? null, f.growth ?? null]), e.target_low ?? null, e.target_mean ?? null, e.target_high ?? null, e.rating ?? null, e.analysts ?? null).labels} />
          </WidgetCard>
        </Grid>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function PriceTargetBar({ low, mean, high }: { low: number | null; mean: number | null; high: number | null }) {
  if (low === null || high === null || high <= low) {
    return <div style={{ fontSize: 12, color: "var(--text-hint)" }}>Price target range: Not available</div>;
  }
  const pos = mean !== null ? ((mean - low) / (high - low)) * 100 : 50;
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Price target range (INR)</div>
      <div style={{ position: "relative", height: 8, borderRadius: 99, background: "linear-gradient(90deg, #cde2fb, #3987e5)" }}>
        {mean !== null && <span style={{ position: "absolute", left: `calc(${Math.max(0, Math.min(100, pos))}% - 6px)`, top: -3, width: 14, height: 14, borderRadius: "50%", background: "#fff", border: "3px solid var(--primary)" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: "var(--text-muted)" }}>{fmtPrice(low)}</span>
        {mean !== null && <span style={{ fontWeight: 700, color: "var(--primary-text)" }}>{fmtPrice(mean)}</span>}
        <span style={{ color: "var(--text-muted)" }}>{fmtPrice(high)}</span>
      </div>
    </div>
  );
}

const cellR: React.CSSProperties = { padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
