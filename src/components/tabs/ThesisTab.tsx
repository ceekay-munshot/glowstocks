"use client";

import type { CompanyReport, Scenario, ThesisPoint } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue, CiteWrap } from "../CitedValue";
import { StancePill } from "../Stance";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { Grid } from "./Grid";
import { scenarioUpsideOption } from "@/lib/charts";
import { num } from "@/lib/format";

function PointList({ points, kind }: { points: ThesisPoint[]; kind: "support" | "counter" }) {
  const color = kind === "support" ? "var(--status-good)" : "var(--status-critical)";
  const mark = kind === "support" ? "+" : "−";
  if (!points.length) return <EmptyState />;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      {points.map((p, i) => (
        <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
          <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{mark}</span>
          <CiteWrap c={{ value: null, available: true, source: p.source, url: p.url ?? null }}>
            <span style={{ color: "var(--text-secondary)" }}>{p.text}</span>
          </CiteWrap>
        </li>
      ))}
    </ul>
  );
}

const SCENARIO_COLOR: Record<string, string> = { Bear: "#d03b3b", Base: "#2a78d6", Bull: "#0ca30c" };

function ScenarioCard({ s }: { s: Scenario }) {
  const color = SCENARIO_COLOR[s.name] ?? "var(--text-muted)";
  const rows: { label: string; c?: Scenario[keyof Scenario] }[] = [
    { label: "Probability", c: s.probability },
    { label: "Revenue CAGR", c: s.revenue_cagr },
    { label: "Margin", c: s.margin },
    { label: "Exit P/E", c: s.pe_exit },
    { label: "Target price", c: s.target_price },
    { label: "Upside", c: s.upside },
  ];
  return (
    <div style={{ border: `1px solid ${color}44`, borderTop: `3px solid ${color}`, borderRadius: 12, padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{s.name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "var(--text-muted)" }}>{r.label}</span>
            <CitedValue c={r.c as never} bold />
          </div>
        ))}
      </div>
      {s.narrative && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-hint)", lineHeight: 1.45 }}>{s.narrative}</p>}
    </div>
  );
}

export function ThesisTab({ report }: { report: CompanyReport }) {
  const t = report.thesis;
  const scenarios = t.scenarios ?? [];
  const upsideData = scenarios.map((s) => ({ name: s.name, upside: num(s.upside) }));
  const hasUpside = upsideData.some((d) => d.upside !== null);

  return (
    <Grid>
      <WidgetCard title="Stance" category="analytics">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 100, justifyContent: "center" }}>
          <StancePill stance={t.stance} size="lg" />
          <div style={{ fontSize: 12, color: "var(--text-hint)" }}>Consistent with the Snapshot view.</div>
        </div>
      </WidgetCard>

      <WidgetCard title="What would change the view" subtitle="Measurable thresholds" category="tools" span={2}>
        {t.change_my_mind.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            {t.change_my_mind.map((c, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{c}</li>
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>

      <WidgetCard title="Bull case — supports" category="sector">
        <PointList points={t.supports} kind="support" />
      </WidgetCard>
      <WidgetCard title="Bear case — counters" category="heatmaps">
        <PointList points={t.counters} kind="counter" />
      </WidgetCard>

      <WidgetCard title="Scenario upside" subtitle="Implied upside/downside to target" category="markets">
        {hasUpside ? <EChart option={scenarioUpsideOption(upsideData)} height={240} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="Scenarios" subtitle="Bear · Base · Bull — analyst estimates" category="analytics" span={3}>
        {scenarios.length ? (
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {scenarios.map((s) => (
              <ScenarioCard key={s.name} s={s} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>
    </Grid>
  );
}
