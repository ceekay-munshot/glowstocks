import type { ReactNode } from "react";

/** The standard widget grid (auto-fill, min 340px, 20px gap). */
export function Grid({ min = 340, children }: { min?: number; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 20, gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}
