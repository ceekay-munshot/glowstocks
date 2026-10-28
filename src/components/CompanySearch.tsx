"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { GS } from "@/lib/brand";

interface Hit {
  ticker: string;
  name: string;
  url: string | null;
}

/** Typeahead company search (Indian NSE/BSE), with direct ticker entry as a fallback. */
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
    <div ref={boxRef} className="gs-search relative" style={{ width: lg ? "100%" : "min(420px, 48vw)" }}>
      <div
        className="flex items-center bg-white transition"
        style={{ gap: lg ? 12 : 8, height: lg ? 54 : 32, padding: lg ? "0 18px" : "0 12px", borderRadius: lg ? 14 : 999, border: "1px solid rgba(15,23,42,0.1)", boxShadow: lg ? "0 2px 12px rgba(15,23,42,0.06)" : "none" }}
      >
        <Search size={lg ? 20 : 15} style={{ color: lg ? GS.indigo : "#94a3b8", flexShrink: 0 }} />
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
          className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
          style={{ fontSize: lg ? 16 : 13 }}
        />
        {loading && <span className="gs-spin rounded-full border-2" style={{ width: lg ? 16 : 12, height: lg ? 16 : 12, borderColor: `${GS.indigo}33`, borderTopColor: GS.indigo }} />}
        {lg && !loading && (
          <button onClick={() => commit(active >= 0 ? hits[active] : undefined)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-4 text-[13.5px] font-extrabold text-white" style={{ background: GS.indigo }}>
            Research <ChevronRight size={15} />
          </button>
        )}
      </div>

      {open && hits.length > 0 && (
        <ul className="absolute left-0 right-0 z-40 m-0 max-h-[340px] list-none overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-pop" style={{ top: lg ? 62 : 38 }}>
          {hits.map((h, i) => (
            <li
              key={`${h.ticker}-${i}`}
              onMouseDown={() => commit(h)}
              onMouseEnter={() => setActive(i)}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg transition"
              style={{ padding: lg ? "11px 12px" : "8px 10px", background: active === i ? `${GS.indigo}0d` : "transparent" }}
            >
              <span className="truncate text-ink" style={{ fontSize: lg ? 14.5 : 13 }}>{h.name}</span>
              <span className="tnum shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: `${GS.indigo}12`, color: GS.indigo }}>{h.ticker}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
