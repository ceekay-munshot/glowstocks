import type { ReactNode } from "react";

/** The standard widget grid (auto-fill, min 340px, 20px gap). */
export function Grid({ min = 340, children }: { min?: number; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 20, gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}

/** Section divider used on composite tabs (e.g. "Customers & Capacity"). */
export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 2px 4px" }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
    </div>
  );
}
