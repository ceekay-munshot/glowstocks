import type { ReactNode } from "react";

export type Category =
  | "markets"
  | "analytics"
  | "india"
  | "sector"
  | "tools"
  | "heatmaps";

const CATEGORY: Record<Category, { bg: string; fg: string; border: string }> = {
  markets: { bg: "#eff6ff", fg: "#2563eb", border: "#dbeafe" },
  analytics: { bg: "#f5f3ff", fg: "#7c3aed", border: "#ede9fe" },
  india: { bg: "#fffbeb", fg: "#d97706", border: "#fde68a" },
  sector: { bg: "#f0fdfa", fg: "#0d9488", border: "#99f6e4" },
  tools: { bg: "#f0fdf4", fg: "#16a34a", border: "#bbf7d0" },
  heatmaps: { bg: "#fff1f2", fg: "#e11d48", border: "#fecdd3" },
};

/**
 * The one card every data widget uses (Munshot dashboard-builder standard):
 * 16px radius, blurred white surface, 10px/16px header, recessive body. Never
 * nest a card inside another card.
 */
export function WidgetCard({
  title,
  subtitle,
  category,
  action,
  span,
  bodyPadding = 16,
  children,
}: {
  title: string;
  subtitle?: string;
  category?: Category;
  action?: ReactNode;
  span?: 2 | 3;
  bodyPadding?: number;
  children: ReactNode;
}) {
  const cat = category ? CATEGORY[category] : null;
  return (
    <div
      className="gs-card"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-default)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(8px)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        gridColumn: span ? `span ${span}` : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--card-header)",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-hint)", lineHeight: 1.3 }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {action}
          {cat && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "2px 8px",
                borderRadius: 6,
                border: `1px solid ${cat.border}`,
                background: cat.bg,
                color: cat.fg,
              }}
            >
              {category}
            </span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--card-body)", padding: bodyPadding }}>
        {children}
      </div>
    </div>
  );
}
