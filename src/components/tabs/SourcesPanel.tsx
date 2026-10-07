"use client";

import type { SourceRef, SourceType } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { EmptyState } from "../states";
import { Grid } from "./Grid";

const TYPE_STYLE: Record<SourceType, { label: string; bg: string; fg: string }> = {
  annual_report: { label: "Annual report", bg: "#eff6ff", fg: "#2563eb" },
  concall: { label: "Concall", bg: "#f0fdfa", fg: "#0d9488" },
  investor_presentation: { label: "Investor PPT", bg: "#f5f3ff", fg: "#7c3aed" },
  exchange_filing: { label: "Exchange filing", bg: "#fffbeb", fg: "#d97706" },
  screener: { label: "Screener", bg: "#f0fdf4", fg: "#16a34a" },
  web: { label: "Web", bg: "#f3f4f6", fg: "#4b5563" },
  news: { label: "News", bg: "#fff1f2", fg: "#e11d48" },
  estimate: { label: "Estimate", bg: "#eef2ff", fg: "#4338ca" },
  other: { label: "Other", bg: "#f3f4f6", fg: "#6b7280" },
};

function TypeBadge({ type }: { type: SourceType }) {
  const s = TYPE_STYLE[type] ?? TYPE_STYLE.other;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export function SourcesPanel({ sources, updated }: { sources: SourceRef[]; updated?: string }) {
  return (
    <Grid>
      <WidgetCard
        title="Sources"
        subtitle={`${sources.length} source${sources.length === 1 ? "" : "s"} · the provenance spine for every figure${updated ? ` · updated ${updated.slice(0, 10)}` : ""}`}
        category="tools"
        span={3}
        bodyPadding={0}
      >
        {sources.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--card-header)" }}>
                  <th style={th}>#</th>
                  <th style={th}>Title</th>
                  <th style={th}>Type</th>
                  <th style={th}>Date</th>
                  <th style={th}>Locator</th>
                  <th style={th}>Link</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} id={`source-${s.id}`} style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <td style={{ ...td, color: "var(--text-hint)", fontVariantNumeric: "tabular-nums" }}>{s.id}</td>
                    <td style={{ ...td, fontWeight: 600, color: "var(--text-primary)" }}>{s.title}</td>
                    <td style={td}><TypeBadge type={s.type} /></td>
                    <td style={{ ...td, color: "var(--text-muted)" }}>{s.date ?? "—"}</td>
                    <td style={{ ...td, color: "var(--text-muted)" }}>{s.locator ?? "—"}</td>
                    <td style={td}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>
                          Open ↗
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-hint)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No sources yet" hint="Run the engine to populate the provenance spine." />
        )}
      </WidgetCard>
    </Grid>
  );
}

/** Compact, always-visible source trail shown at the bottom of every tab. */
export function SourceTrail({ sources, updated, onViewAll }: { sources: SourceRef[]; updated?: string; onViewAll: () => void }) {
  return (
    <div style={{ marginTop: 20 }}>
      <WidgetCard
        title="Source trail"
        subtitle={`${sources.length} source${sources.length === 1 ? "" : "s"}${updated ? ` · updated ${updated.slice(0, 10)}` : ""}`}
        category="tools"
        action={
          <button onClick={onViewAll} style={{ border: "none", background: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            View all →
          </button>
        }
      >
        {sources.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sources.slice(0, 6).map((s) => (
              <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: 99, padding: "3px 10px" }}>
                <TypeBadge type={s.type} />
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)", textDecoration: "none", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </span>
            ))}
            {sources.length > 6 && <span style={{ fontSize: 11.5, color: "var(--text-hint)", alignSelf: "center" }}>+{sources.length - 6} more</span>}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-hint)" }}>No sources yet.</span>
        )}
      </WidgetCard>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 14px", textAlign: "left", verticalAlign: "top" };
