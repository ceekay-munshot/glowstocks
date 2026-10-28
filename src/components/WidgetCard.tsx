"use client";

import type { ReactNode } from "react";
import type { Accent } from "@/lib/theme";
import { Icon, type IconName } from "./Icon";
import { useAccent } from "./AccentScope";

// Kept for back-compat with existing call sites; colour now comes from the tab
// accent (context) or an explicit `accent` prop, not this category.
export type Category =
  | "markets"
  | "analytics"
  | "india"
  | "sector"
  | "tools"
  | "heatmaps";

/**
 * The one card every data widget uses (dashboard-builder structure: 16px radius,
 * blurred surface, 10/16 header, recessive body, never nested) — now VIVID: a
 * gradient accent header, a top accent bar and a tinted icon chip, coloured by
 * the active tab's accent (via AccentScope) or an explicit `accent`.
 */
export function WidgetCard({
  title,
  subtitle,
  icon,
  accent,
  action,
  span,
  bodyPadding = 16,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  accent?: Accent;
  /** @deprecated colour now comes from the tab accent; accepted for back-compat. */
  category?: Category;
  action?: ReactNode;
  span?: 2 | 3;
  bodyPadding?: number;
  children: ReactNode;
}) {
  const ctx = useAccent();
  const a = accent ?? ctx;
  return (
    <div className={`gs-card${span ? ` gs-span-${span}` : ""}`}>
      <span className="gs-card__bar" style={{ background: `linear-gradient(90deg, ${a.main}, ${a.main}00)` }} />
      <div
        className="gs-card__head"
        style={{ background: `linear-gradient(120deg, ${a.soft} 0%, rgba(255,255,255,0.6) 70%)`, borderBottom: `1px solid ${a.line}` }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {icon && (
            <span className="gs-card__chip" style={{ background: a.soft, color: a.main, border: `1px solid ${a.line}` }}>
              <Icon name={icon} size={16} color={a.main} />
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.25 }}>{title}</h3>
            {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--text-hint)", lineHeight: 1.3 }}>{subtitle}</p>}
          </div>
        </div>
        {action && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{action}</div>}
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--card-body)", padding: bodyPadding }}>
        {children}
      </div>
    </div>
  );
}
