"use client";

import type { CompanyReport } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { KpiStrip } from "../KpiStrip";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { AccentScope } from "../AccentScope";
import { Grid, SubHeading } from "./Grid";
import { customerMixDonutOption, valueBarsOption } from "@/lib/charts";
import { SECTION_META } from "@/lib/theme";
import { fmtCr, fmtPct, num } from "@/lib/format";

export function CustomersCapacityTab({ report }: { report: CompanyReport }) {
  const c = report.customers;
  const cap = report.capacity;

  const hasMix = !!c && c.groups.some((g) => g.concentration?.available);
  const orderRows =
    c?.order_book
      .map((o) => ({ label: o.metric, value: num(o.value) }))
      .filter((r): r is { label: string; value: number } => r.value !== null) ?? [];

  const capRows = (cap?.sites ?? [])
    .map((s) => ({ label: s.site, value: num(s.capacity ?? null) }))
    .filter((r): r is { label: string; value: number } => r.value !== null);
  const utilRows = (cap?.sites ?? [])
    .map((s) => ({ label: s.site, value: num(s.utilization ?? null) }))
    .filter((r): r is { label: string; value: number } => r.value !== null);

  return (
    <>
      <AccentScope accent={SECTION_META.customers.accent}>
        <SubHeading icon="users">Customers &amp; order book</SubHeading>
        {!c || (!c.applicable && c.groups.length === 0 && c.order_book.length === 0) ? (
          <Grid>
            <WidgetCard title="Customers & order book" icon="users" span={3}>
              <EmptyState title={c?.applicable === false ? "Not applicable" : "Not available"} hint={c?.not_applicable_reason} />
            </WidgetCard>
          </Grid>
        ) : (
          <Grid>
            <WidgetCard title="Customer mix" subtitle={c.summary ?? "Revenue by client bucket"} icon="users">
              {hasMix ? <EChart option={customerMixDonutOption(c.groups)} height={300} /> : <EmptyState />}
            </WidgetCard>

            <WidgetCard title="Order book / TCV" subtitle="Deal pipeline · INR crore" icon="bars" span={2}>
              {orderRows.length ? (
                <EChart option={valueBarsOption(orderRows, fmtCr)} height={Math.max(220, orderRows.length * 60)} />
              ) : (
                <EmptyState />
              )}
            </WidgetCard>

            <WidgetCard title="Client concentration" subtitle="Share of revenue · dependency risk" icon="scale" span={2} bodyPadding={0}>
              {c.groups.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--card-header)" }}>
                      <th style={th}>Client group</th>
                      <th style={{ ...th, textAlign: "right" }}>% revenue</th>
                      <th style={th}>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.groups.map((g) => (
                      <tr key={g.segment} style={{ borderBottom: "1px solid var(--border-default)" }}>
                        <td style={{ padding: "9px 14px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{g.segment}</div>
                          {g.names && <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{g.names}</div>}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}><CitedValue c={g.concentration} bold /></td>
                        <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--text-muted)" }}>{g.risk ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState />
              )}
            </WidgetCard>

            <WidgetCard title="Order book detail" icon="doc">
              {c.order_book.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {c.order_book.map((o) => (
                    <div key={o.metric} style={{ fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                        <span>{o.metric}</span>
                        <CitedValue c={o.value} bold />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-hint)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {o.mix && <span>{o.mix}</span>}
                        {o.coverage?.available && <span>B2B {num(o.coverage)}x</span>}
                        {o.qoq_change?.available && <span>QoQ {(num(o.qoq_change) ?? 0) > 0 ? "+" : ""}{num(o.qoq_change)}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </WidgetCard>
          </Grid>
        )}
      </AccentScope>

      <AccentScope accent={SECTION_META.capacity.accent}>
        <SubHeading icon="factory">Capacity &amp; footprint</SubHeading>
        {!cap || (!cap.applicable && cap.sites.length === 0 && cap.metrics.length === 0) ? (
          <Grid>
            <WidgetCard title="Capacity & footprint" icon="factory" span={3}>
              <EmptyState title={cap?.applicable === false ? "Not applicable" : "Not available"} hint={cap?.not_applicable_reason} />
            </WidgetCard>
          </Grid>
        ) : (
          <Grid>
            <WidgetCard title="Footprint metrics" subtitle={cap.summary ?? (cap.kind === "delivery" ? "Delivery footprint" : "Operating footprint")} icon="factory" span={2}>
              {cap.metrics.length ? <KpiStrip metrics={cap.metrics} /> : <EmptyState />}
            </WidgetCard>

            <WidgetCard title={capRows.length ? "Capacity by site" : "Utilization by site"} subtitle={capRows.length ? "Installed capacity" : "Delivery utilization · %"} icon="bars">
              {capRows.length ? (
                <EChart option={valueBarsOption(capRows, (v) => String(Math.round(v)))} height={Math.max(220, capRows.length * 52)} />
              ) : utilRows.length ? (
                <EChart option={valueBarsOption(utilRows, fmtPct)} height={Math.max(220, utilRows.length * 52)} />
              ) : (
                <EmptyState />
              )}
            </WidgetCard>

            <WidgetCard title="Sites & expansion" subtitle={`${cap.kind === "delivery" ? "Delivery centres" : "Plants / sites"} · hover figures for source`} icon="building" span={3} bodyPadding={0}>
              {cap.sites.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--card-header)" }}>
                        {["Site", "Product", "Capacity", "Utilization", "Capex", "Expansion", "Timeline"].map((h, i) => (
                          <th key={h} style={{ ...th, textAlign: i >= 2 && i <= 4 ? "right" : "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cap.sites.map((s) => (
                        <tr key={s.site} style={{ borderBottom: "1px solid var(--border-default)" }}>
                          <td style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-primary)" }}>{s.site}</td>
                          <td style={{ padding: "9px 14px", color: "var(--text-muted)" }}>{s.product ?? "—"}</td>
                          <td style={cellR}><CitedValue c={s.capacity ?? null} /></td>
                          <td style={cellR}><CitedValue c={s.utilization ?? null} /></td>
                          <td style={cellR}><CitedValue c={s.capex ?? null} /></td>
                          <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--text-muted)" }}>{s.expansion ?? "—"}</td>
                          <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--text-muted)" }}>{s.timeline ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState />
              )}
            </WidgetCard>
          </Grid>
        )}
      </AccentScope>
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
const cellR: React.CSSProperties = { padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
