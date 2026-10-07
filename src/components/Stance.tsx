import type { Stance } from "@/lib/types/report";
import { STANCE_COLOR } from "@/lib/palette";

export function StancePill({ stance, size = "md" }: { stance: Stance; size?: "md" | "lg" }) {
  const color = STANCE_COLOR[stance] ?? STANCE_COLOR["Not available"];
  const big = size === "lg";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: big ? "6px 16px" : "3px 10px",
        borderRadius: 99,
        fontSize: big ? 18 : 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color,
        background: `${color}1a`,
        border: `1px solid ${color}55`,
      }}
    >
      <span style={{ width: big ? 9 : 6, height: big ? 9 : 6, borderRadius: "50%", background: color }} />
      {stance}
    </span>
  );
}
