"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

interface Hit {
  ticker: string;
  name: string;
  url: string | null;
}

/**
 * Typeahead company search (Indian NSE/BSE via the server-side search proxy),
 * with direct ticker entry as a fallback (Enter commits the raw text). Two sizes:
 * a compact header variant and a large landing-hero variant.
 */
export function CompanySearch({
  onSelect,
  size = "sm",
  placeholder = "Search a company or ticker (e.g. TCS, Infosys)…",
  autoFocus = false,
}: {
  onSelect: (ticker: string, name: string) => void;
  size?: "sm" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const lg = size === "lg";

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(q.trim())}`);
        const data = (await res.json()) as { results?: Hit[] };
        if (!cancelled) {
          setHits(data.results ?? []);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const commit = (h?: Hit) => {
    if (h) onSelect(h.ticker, h.name);
    else if (q.trim()) onSelect(q.trim().toUpperCase(), "");
    setOpen(false);
    setQ("");
    setHits([]);
  };

  return (
    <div
      ref={boxRef}
      className="gs-search"
      style={{ position: "relative", width: lg ? "100%" : "min(420px, 48vw)" }}
    >
      <div
        className="gs-bigsearch"
        style={{
          display: "flex",
          alignItems: "center",
          gap: lg ? 12 : 8,
          height: lg ? 54 : 32,
          padding: lg ? "0 18px" : "0 12px",
          background: "#fff",
          border: `1px solid ${lg ? "var(--border-default)" : "var(--border-default)"}`,
          borderRadius: lg ? 14 : 99,
          boxShadow: lg ? "0 2px 10px rgba(15,23,42,0.05)" : "none",
        }}
      >
        <Icon name="search" size={lg ? 20 : 15} color={lg ? "var(--primary)" : "var(--text-hint)"} />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            else if (e.key === "Enter") commit(active >= 0 ? hits[active] : undefined);
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            fontSize: lg ? 16 : 13,
            color: "var(--text-primary)",
            background: "transparent",
          }}
        />
        {loading && <span className="gs-spin" style={{ width: lg ? 16 : 12, height: lg ? 16 : 12, border: "2px solid var(--primary-border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />}
        {lg && !loading && (
          <button
            onClick={() => commit(active >= 0 ? hits[active] : undefined)}
            style={{ height: 38, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Research <Icon name="chevronRight" size={15} color="#fff" />
          </button>
        )}
      </div>

      {open && hits.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: lg ? 62 : 38,
            left: 0,
            right: 0,
            zIndex: 40,
            margin: 0,
            padding: 5,
            listStyle: "none",
            background: "#fff",
            border: "1px solid var(--border-default)",
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(15,23,42,0.16)",
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {hits.map((h, i) => (
            <li
              key={`${h.ticker}-${i}`}
              onMouseDown={() => commit(h)}
              onMouseEnter={() => setActive(i)}
              className="gs-rowh"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: lg ? "11px 12px" : "8px 10px", borderRadius: 9, cursor: "pointer", background: active === i ? "var(--primary-light)" : "transparent" }}
            >
              <span style={{ fontSize: lg ? 14.5 : 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-text)", background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{h.ticker}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
