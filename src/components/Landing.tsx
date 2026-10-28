"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CompanyRow } from "@/lib/bundledReports";
import { coverageAccent, logoGradient, timeAgo } from "@/lib/theme";
import { Icon } from "./Icon";
import { CompanySearch } from "./CompanySearch";
import { StancePill } from "./Stance";

type SortKey = "company" | "updated" | "coverage";

export function Landing({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("updated");
  const [asc, setAsc] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const go = (ticker: string) => router.push(`/company/${encodeURIComponent(ticker)}`);
  const update = (ticker: string) => router.push(`/company/${encodeURIComponent(ticker)}?run=1`);

  const rows = useMemo(() => {
    const dir = asc ? 1 : -1;
    return [...companies].sort((a, b) => {
      if (sort === "company") return dir * a.company.localeCompare(b.company);
      if (sort === "coverage") return dir * (a.coverageDone / a.coverageTotal - b.coverageDone / b.coverageTotal);
      return dir * (new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime());
    });
  }, [companies, sort, asc]);

  const setSortKey = (k: SortKey) => {
    if (k === sort) setAsc((v) => !v);
    else {
      setSort(k);
      setAsc(k === "company");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Zone 1 — brand bar */}
      <header className="gs-header" style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, padding: "0 20px", background: "var(--header-bar)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border-default)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <LogoMark />
          <h1 style={{ fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
            glow<span style={{ color: "var(--primary)" }}>stocks</span>
          </h1>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="globe" size={14} color="var(--text-muted)" /> India · NSE / BSE
        </span>
      </header>

      {/* Zone 2 — scrollable */}
      <main className="gs-scroll" style={{ flex: 1, overflow: "auto" }}>
        <div className="gs-maxw" style={{ padding: "0 24px 48px" }}>
          {/* Hero */}
          <section style={{ textAlign: "center", padding: "56px 0 20px", maxWidth: 760, margin: "0 auto" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "var(--primary-text)", background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: 99, padding: "5px 13px", marginBottom: 18 }}>
              <Icon name="sparkles" size={14} color="var(--primary)" /> Source-backed equity research
            </span>
            <h2 style={{ fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1.08, fontWeight: 850, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
              Research any Indian company,{" "}
              <span style={{ background: "linear-gradient(100deg,#2563eb,#7c3aed 45%,#0d9488)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                beautifully.
              </span>
            </h2>
            <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "0 auto 28px", maxWidth: 560, lineHeight: 1.55 }}>
              Search a listed company and get a vivid, chart-led report — financials, peers, growth, risks and more, with every figure traced to its source.
            </p>
            <div style={{ maxWidth: 620, margin: "0 auto" }}>
              <CompanySearch size="lg" autoFocus onSelect={(t) => go(t)} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 22 }}>
              <FeatureChip icon="bars" color="#d97706" bg="#fffbeb">13 research sections</FeatureChip>
              <FeatureChip icon="link" color="#2563eb" bg="#eff6ff">Every number sourced</FeatureChip>
              <FeatureChip icon="download" color="#16a34a" bg="#f0fdf4">PDF &amp; Excel exports</FeatureChip>
            </div>
          </section>

          {/* Previous runs */}
          <section className="gs-rise" style={{ marginTop: 20 }}>
            <div className="gs-card" style={{ overflow: "visible" }}>
              <span className="gs-card__bar" style={{ background: "linear-gradient(90deg,#2563eb,#2563eb00)" }} />
              <div className="gs-card__head" style={{ background: "linear-gradient(120deg,#eff6ff 0%, rgba(255,255,255,0.6) 70%)", borderBottom: "1px solid #dbeafe" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="gs-card__chip" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe" }}>
                    <Icon name="layers" size={16} color="#2563eb" />
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Previous runs</h3>
                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--text-hint)" }}>{rows.length} researched {rows.length === 1 ? "company" : "companies"} · open or refresh any</p>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: "var(--card-header)", borderBottom: "1px solid var(--border-default)" }}>
                      <Th label="Company" onClick={() => setSortKey("company")} active={sort === "company"} asc={asc} />
                      <Th label="Last run" onClick={() => setSortKey("updated")} active={sort === "updated"} asc={asc} />
                      <Th label="Coverage" onClick={() => setSortKey("coverage")} active={sort === "coverage"} asc={asc} />
                      <th style={{ padding: "11px 16px", textAlign: "right", color: "var(--text-muted)", fontWeight: 700, fontSize: 12 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const cov = coverageAccent(r.coverageDone, r.coverageTotal);
                      const g = logoGradient(r.ticker);
                      return (
                        <tr key={r.ticker} className="gs-rowh" style={{ borderBottom: "1px solid var(--border-default)", cursor: "pointer" }} onClick={() => go(r.ticker)}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${g.from}, ${g.to})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, letterSpacing: "0.02em", boxShadow: "0 2px 6px rgba(15,23,42,0.18)" }}>
                                {r.ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{r.company}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-text)", background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: 6, padding: "1px 7px" }}>{r.ticker}</span>
                                  {r.is_sample && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "1px 7px", letterSpacing: "0.03em" }}>SAMPLE</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--text-hint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>
                                  {[r.sector, r.industry].filter(Boolean).join(" · ") || r.exchange}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }} title={new Date(r.last_updated).toLocaleString()}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                              <Icon name="calendar" size={14} color="var(--text-hint)" />
                              {mounted ? timeAgo(r.last_updated) : r.last_updated.slice(0, 10)}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: cov.main, background: cov.soft, border: `1px solid ${cov.line}`, borderRadius: 99, padding: "3px 10px" }}>
                              <Icon name="check" size={13} color={cov.main} />
                              {r.coverageDone}/{r.coverageTotal}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "inline-flex", gap: 8 }}>
                              <button onClick={() => update(r.ticker)} title="Refresh this research" style={rowBtn(false)}>
                                <Icon name="refresh" size={14} color="var(--text-secondary)" /> Update
                              </button>
                              <button onClick={() => go(r.ticker)} style={rowBtn(true)}>
                                View <Icon name="chevronRight" size={14} color="#fff" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer style={{ flexShrink: 0, borderTop: "1px solid var(--border-default)", background: "var(--card-header)", padding: "9px 24px" }}>
        <div style={{ maxWidth: 1640, margin: "0 auto", fontSize: 11, color: "var(--text-hint)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>glowstocks · source-backed equity research · India (NSE / BSE)</span>
          <span>Not investment advice. The sample is illustrative.</span>
        </div>
      </footer>
    </div>
  );
}

function Th({ label, onClick, active, asc }: { label: string; onClick: () => void; active: boolean; asc: boolean }) {
  return (
    <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 700, fontSize: 12 }}>
      <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, color: active ? "var(--primary)" : "var(--text-muted)" }}>
        {label}
        <span style={{ fontSize: 9, opacity: active ? 1 : 0.3 }}>{active ? (asc ? "▲" : "▼") : "▲"}</span>
      </button>
    </th>
  );
}

function FeatureChip({ icon, color, bg, children }: { icon: "bars" | "link" | "download"; color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", background: "#fff", border: "1px solid var(--border-default)", borderRadius: 99, padding: "6px 13px" }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, background: bg, color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={13} color={color} />
      </span>
      {children}
    </span>
  );
}

function LogoMark() {
  return (
    <span style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(79,70,229,0.35)" }}>
      <Icon name="trendUp" size={16} color="#fff" strokeWidth={2.4} />
    </span>
  );
}

const rowBtn = (primary: boolean): React.CSSProperties => ({
  height: 30,
  padding: primary ? "0 11px" : "0 10px",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  border: primary ? "none" : "1px solid var(--border-default)",
  background: primary ? "var(--primary)" : "#fff",
  color: primary ? "#fff" : "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
});
