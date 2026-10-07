"use client";

import { useEffect, useRef, useState } from "react";

interface Hit {
  ticker: string;
  name: string;
  url: string | null;
}

/**
 * Typeahead company search (Indian NSE/BSE via the server-side Screener proxy),
 * with direct ticker entry as a fallback (Enter commits the raw text).
 */
export function CompanySearch({ onSelect }: { onSelect: (ticker: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

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
    if (h) {
      onSelect(h.ticker, h.name);
    } else if (q.trim()) {
      onSelect(q.trim().toUpperCase(), "");
    }
    setOpen(false);
    setQ("");
    setHits([]);
  };

  return (
    <div ref={boxRef} style={{ position: "relative", width: "min(420px, 48vw)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px", background: "#fff", border: "1px solid var(--border-default)", borderRadius: 99 }}>
        <span style={{ color: "var(--text-hint)", fontSize: 13 }}>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            else if (e.key === "Enter") commit(active >= 0 ? hits[active] : undefined);
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search a company or enter a ticker (e.g. TCS)…"
          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "var(--text-primary)", background: "transparent" }}
        />
        {loading && <span style={{ fontSize: 11, color: "var(--text-hint)" }}>…</span>}
      </div>

      {open && hits.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: 38,
            left: 0,
            right: 0,
            zIndex: 40,
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "#fff",
            border: "1px solid var(--border-default)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {hits.map((h, i) => (
            <li
              key={`${h.ticker}-${i}`}
              onMouseDown={() => commit(h)}
              onMouseEnter={() => setActive(i)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: active === i ? "var(--primary-light)" : "transparent" }}
            >
              <span style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary-text)", background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: 6, padding: "1px 7px", flexShrink: 0 }}>{h.ticker}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
