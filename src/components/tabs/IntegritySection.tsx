"use client";

import type { CompanyReport, IntegrityStatus } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { EmptyState } from "../states";
import { Grid, SubHeading } from "./Grid";

const STATUS: Record<IntegrityStatus, { color: string; bg: string; border: string; icon: string; label: string }> = {
  pass: { color: "#067647", bg: "#ecfdf3", border: "#bbf7d0", icon: "✓", label: "Pass" },
  warn: { color: "#b54708", bg: "#fffaeb", border: "#fde68a", icon: "!", label: "Warn" },
  fail: { color: "#b42318", bg: "#fef3f2", border: "#fecaca", icon: "✗", label: "Fail" },
  "Not available": { color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb", icon: "○", label: "N/A" },
};

export function IntegritySection({ report }: { report: CompanyReport }) {
  const it = report.integrity;
  return (
    <>
      <SubHeading>Integrity gate</SubHeading>
      <Grid>
        <WidgetCard title="Integrity gate" subtitle={it?.coverage_note ?? "Data-trust checklist"} category="tools" span={3}>
          {!it || it.checks.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {it.checks.map((c, i) => {
                const s = STATUS[c.status] ?? STATUS["Not available"];
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid var(--border-default)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{s.icon}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{c.check}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.label}</span>
                      </div>
                      {c.detail && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{c.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      </Grid>
    </>
  );
}
