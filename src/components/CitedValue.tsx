import type { ReactNode } from "react";
import type { Cited } from "@/lib/types/report";
import { citedText, NA } from "@/lib/format";

/** The hover popover body: source · date · locator (+ link). */
function Pop({ c }: { c: Cited<number | string> }) {
  const meta = [c.date, c.locator].filter(Boolean).join(" · ");
  return (
    <span className="gs-cite__pop" role="tooltip">
      <span className="gs-cite__src">{c.source || "Source on file"}</span>
      {meta && <span className="gs-cite__meta">{meta}</span>}
      {c.note && <span className="gs-cite__meta">{c.note}</span>}
      {c.url && (
        <span className="gs-cite__meta">
          <a href={c.url} target="_blank" rel="noopener noreferrer">
            Open source ↗
          </a>
        </span>
      )}
    </span>
  );
}

/**
 * A cited number/string that reveals its source + date + locator on hover.
 * "Not available" when the datum wasn't supported by the sources (never guessed).
 */
export function CitedValue({
  c,
  bold,
  color,
  size,
}: {
  c?: Cited<number | string> | null;
  bold?: boolean;
  color?: string;
  size?: number;
}) {
  const style: React.CSSProperties = {
    fontWeight: bold ? 600 : 400,
    color: color ?? "var(--text-primary)",
    fontSize: size,
  };
  if (!c || !c.available || c.value === null || c.value === undefined) {
    return (
      <span style={{ ...style, color: "var(--text-hint)", fontStyle: "italic", fontWeight: 400 }}>{NA}</span>
    );
  }
  return (
    <span className="gs-cite" style={style} tabIndex={0}>
      {citedText(c)}
      <Pop c={c} />
    </span>
  );
}

/** Wrap arbitrary children with a citation hover (e.g. a thesis point). */
export function CiteWrap({ c, children }: { c?: Cited<number | string> | null; children: ReactNode }) {
  if (!c || (!c.source && !c.url)) return <>{children}</>;
  return (
    <span className="gs-cite" tabIndex={0}>
      {children}
      <Pop c={c as Cited<number | string>} />
    </span>
  );
}
