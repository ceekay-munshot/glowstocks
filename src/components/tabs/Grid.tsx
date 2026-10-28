"use client";

import type { ReactNode } from "react";
import type { Accent } from "@/lib/theme";
import { Icon, type IconName } from "../Icon";
import { useAccent } from "../AccentScope";

/**
 * The widget grid. A responsive FIXED column count (3 on desktop, 2 on tablet,
 * 1 on phone) so `span` cards always tile the full content width with no dead
 * gutter on the right — see `.gs-grid` / `.gs-span-*` in globals.css.
 */
export function Grid({ children }: { children: ReactNode }) {
  return <div className="gs-grid">{children}</div>;
}

/** Colourful section divider for composite tabs — tinted icon chip + accent rule. */
export function SubHeading({
  children,
  icon,
  accent,
  hint,
}: {
  children: ReactNode;
  icon?: IconName;
  accent?: Accent;
  hint?: string;
}) {
  const ctx = useAccent();
  const a = accent ?? ctx;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "30px 2px 10px" }}>
      {icon && (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: a.soft,
            color: a.main,
            border: `1px solid ${a.line}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={16} color={a.main} />
        </span>
      )}
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.01em", color: a.main }}>{children}</span>
      {hint && <span style={{ fontSize: 11.5, color: "var(--text-hint)", fontWeight: 500 }}>{hint}</span>}
      <span style={{ flex: 1, height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${a.line}, transparent)` }} />
    </div>
  );
}
