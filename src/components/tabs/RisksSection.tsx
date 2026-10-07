"use client";

import type { CompanyReport, RiskLevel } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { EmptyState } from "../states";
import { Grid, SubHeading } from "./Grid";

const LEVEL: Record<RiskLevel, { color: string; bg: string; border: string }> = {
  High: { color: "#b42318", bg: "#fef3f2", border: "#fecaca" },
  Medium: { color: "#b54708", bg: "#fffaeb", border: "#fde68a" },
  Low: { color: "#067647", bg: "#ecfdf3", border: "#bbf7d0" },
  "Not available": { color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
};

function LevelChip({ kind, level }: { kind: string; level: RiskLevel }) {
  const s = LEVEL[level] ?? LEVEL["Not available"];
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {kind}: {level}
    </span>
  );
}

export function RisksSection({ report }: { report: CompanyReport }) {
  const r = report.risks;
  return (
    <>
      <SubHeading>Risk register</SubHeading>
      {!r || (r.register.length === 0 && r.downside_scenarios.length === 0) ? (
        <Grid>
          <WidgetCard title="Risk register" category="heatmaps" span={3}>
            <EmptyState />
          </WidgetCard>
        </Grid>
      ) : (
        <Grid>
          <WidgetCard title="Risk register" subtitle={r.summary ?? "Severity × probability, company-specific"} category="heatmaps" span={2}>
            {r.register.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {r.register.map((row, i) => (
                  <div key={i} style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{row.risk}</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <LevelChip kind="Sev" level={row.severity} />
                        <LevelChip kind="Prob" level={row.probability} />
                      </span>
                    </div>
                    {row.evidence && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{row.evidence}</div>}
                    {row.transmission && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>→ {row.transmission}</div>}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                      {row.leading_indicators && <span style={{ fontSize: 11, color: "var(--text-hint)" }}>Watch: {row.leading_indicators}</span>}
                      {row.mitigants && <span style={{ fontSize: 11, color: "var(--status-good)" }}>Mitigant: {row.mitigants}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </WidgetCard>

          <WidgetCard title="Top downside scenarios" subtitle="Trigger · impact · probability" category="heatmaps">
            {r.downside_scenarios.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {r.downside_scenarios.map((d, i) => (
                  <div key={i} style={{ border: "1px solid #fecaca", borderLeft: "3px solid var(--status-critical)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--status-critical)" }}>{d.name}</span>
                      <CitedValue c={d.probability ?? null} bold />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>Trigger: {d.trigger}</div>
                    {d.impact && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Impact: {d.impact}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </WidgetCard>
        </Grid>
      )}
    </>
  );
}
