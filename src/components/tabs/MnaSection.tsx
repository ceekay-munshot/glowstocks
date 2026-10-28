"use client";

import type { CompanyReport } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { EmptyState } from "../states";
import { AccentScope } from "../AccentScope";
import { Grid, SubHeading } from "./Grid";
import { SECTION_META } from "@/lib/theme";

export function MnaSection({ report }: { report: CompanyReport }) {
  const m = report.mna;
  return (
    <AccentScope accent={SECTION_META.mna.accent}>
      <SubHeading icon="handshake">M&amp;A &amp; inorganic</SubHeading>
      <Grid>
        <WidgetCard title="M&A timeline" subtitle={m?.summary ?? "Inorganic moves"} icon="handshake" span={3}>
          {!m || !m.found || m.deals.length === 0 ? (
            <EmptyState title={m && !m.found ? "No material M&A found" : "Not available"} hint={m?.summary} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {m.deals.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", whiteSpace: "nowrap" }}>{d.date ?? "—"}</span>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0d9488", marginTop: 4 }} />
                    {i < m.deals.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--border-default)", marginTop: 2 }} />}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{d.target}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{d.status ?? ""}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>{d.what}</div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 2, fontSize: 12, color: "var(--text-muted)" }}>
                      <span>Deal size: <CitedValue c={d.deal_size ?? null} /></span>
                      {d.payment && <span>Payment: {d.payment}</span>}
                    </div>
                    {d.rationale && <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>Rationale: {d.rationale}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      </Grid>
    </AccentScope>
  );
}
