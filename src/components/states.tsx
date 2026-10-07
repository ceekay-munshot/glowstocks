import type { ReactNode } from "react";

/** Shimmer skeleton block (mandatory loading state). */
export function Shimmer({ height = 16, width = "100%", radius = 6, style }: { height?: number | string; width?: number | string; radius?: number; style?: React.CSSProperties }) {
  return <div className="gs-shimmer" style={{ height, width, borderRadius: radius, ...style }} />;
}

/** A card-body-sized shimmer placeholder for a loading chart/table. */
export function ChartSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 160, justifyContent: "center" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} height={14} width={`${90 - i * 8}%`} />
      ))}
    </div>
  );
}

function CenteredState({ icon, iconBg, iconFg, title, hint }: { icon: ReactNode; iconBg: string; iconFg: string; title: string; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 160, gap: 8, padding: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--text-hint)", maxWidth: 280 }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ title = "Not available", hint }: { title?: string; hint?: string }) {
  return <CenteredState icon="○" iconBg="#f3f4f6" iconFg="#9ca3af" title={title} hint={hint ?? "The sources didn't contain this — nothing was guessed."} />;
}

export function ErrorState({ title = "Couldn't load this", hint = "Please try again later." }: { title?: string; hint?: string }) {
  return <CenteredState icon="!" iconBg="var(--error-bg)" iconFg="var(--error-red)" title={title} hint={hint} />;
}
