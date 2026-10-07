"use client";

import type { CompanyReport, DriverDirection } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue, CiteWrap } from "../CitedValue";
import { EmptyState } from "../states";
import { Grid, SubHeading } from "./Grid";

const DIR: Record<DriverDirection, { color: string; label: string; arrow: string }> = {
  tailwind: { color: "var(--status-good)", label: "Tailwind", arrow: "▲" },
  headwind: { color: "var(--status-critical)", label: "Headwind", arrow: "▼" },
  neutral: { color: "var(--text-muted)", label: "Neutral", arrow: "▬" },
  "Not available": { color: "var(--text-hint)", label: "—", arrow: "▬" },
};

export function GrowthConcallTab({ report }: { report: CompanyReport }) {
  const g = report.growth;
  const cc = report.concall;

  return (
    <>
      <SubHeading>Growth drivers &amp; catalysts</SubHeading>
      <Grid>
        <WidgetCard title="Growth drivers" subtitle={g?.summary ?? "Numbers & guidance behind the growth"} category="analytics" span={2}>
          {g && g.drivers.length ? (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
              {g.drivers.map((d, i) => {
                const dir = DIR[d.direction] ?? DIR.neutral;
                return (
                  <div key={`${d.name}-${i}`} style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: "10px 12px", background: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>{d.name}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: dir.color, whiteSpace: "nowrap" }}>{dir.arrow} {dir.label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{d.detail}</span>
                    {d.metric?.available && (
                      <span style={{ fontSize: 12, fontWeight: 600 }}><CitedValue c={d.metric} /></span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </WidgetCard>

        <WidgetCard title="Catalyst watchlist" subtitle="What to watch, and what confirms vs falsifies" category="tools">
          {g && g.catalysts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {g.catalysts.map((cat, i) => (
                <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 3 }} />
                    {i < g.catalysts.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--border-default)" }} />}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cat.catalyst}</div>
                    <div style={{ color: "var(--text-hint)" }}>{cat.timing} · KPI: {cat.kpi}</div>
                    {cat.confirms && <div style={{ color: "var(--status-good)" }}>✓ {cat.confirms}</div>}
                    {cat.falsifies && <div style={{ color: "var(--status-critical)" }}>✗ {cat.falsifies}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </WidgetCard>

        <WidgetCard title="Downside triggers" subtitle="Bear-case watch items" category="heatmaps" span={3}>
          {g && g.downside_triggers.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {g.downside_triggers.map((t, i) => (
                <span key={i} style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 99, padding: "5px 12px" }}>▼ {t}</span>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </WidgetCard>
      </Grid>

      <SubHeading>Latest concall</SubHeading>
      {!cc || !cc.available ? (
        <Grid>
          <WidgetCard title="Concall highlights" category="analytics" span={3}>
            <EmptyState title="Not available" hint={cc?.tone ?? "No concall transcript was harvested."} />
          </WidgetCard>
        </Grid>
      ) : (
        <Grid>
          <WidgetCard title={`Concall highlights — ${cc.period ?? ""}`} subtitle={cc.tone} category="analytics" span={2}>
            {cc.highlights.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cc.highlights.map((h, i) => (
                  <div key={i} style={{ borderLeft: "3px solid var(--primary)", background: "#fff", borderRadius: "0 10px 10px 0", padding: "8px 12px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>{h.theme}</div>
                    <CiteWrap c={{ value: null, available: true, source: h.source, url: h.url ?? null, date: h.date }}>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5, margin: "2px 0" }}>“{h.quote}”</div>
                    </CiteWrap>
                    <div style={{ fontSize: 11, color: "var(--text-hint)" }}>— {h.speaker}{h.date ? ` · ${h.date}` : ""}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </WidgetCard>

          <WidgetCard title="So what — key insights" subtitle="Reading between the lines" category="tools">
            {cc.insights.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 9 }}>
                {cc.insights.map((ins, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{ins}</li>
                ))}
              </ul>
            ) : (
              <EmptyState />
            )}
          </WidgetCard>
        </Grid>
      )}
    </>
  );
}
