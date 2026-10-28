"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { rampGYR, withAlpha } from "@/lib/brand";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  sortable?: boolean;
  sortValue?: (r: Row) => number | string;
  render: (r: Row, index: number) => ReactNode;
  /** heat background: return 0..1 intensity (null = none) */
  heat?: (r: Row) => number | null;
  heatScale?: "gyr" | "hue";
  heatColor?: string;
  headerHint?: string;
}

function heatBg(t: number, scale: "gyr" | "hue", hue: string): string {
  const alpha = 0.1 + 0.5 * Math.max(0, Math.min(1, t));
  if (scale === "gyr") return withAlpha(rampGYR(t), alpha);
  return withAlpha(hue, alpha);
}

export function Table<Row>({
  columns,
  rows,
  getKey,
  initialSort,
  onRowClick,
  activeKey,
  headerColor = "#4f46e5",
  dense = false,
  stickyHeader = true,
  maxHeight,
}: {
  columns: Column<Row>[];
  rows: Row[];
  getKey: (r: Row) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  onRowClick?: (r: Row) => void;
  activeKey?: string | null;
  headerColor?: string;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort, columns]);

  const toggleSort = (c: Column<Row>) => {
    if (!c.sortable) return;
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "desc" }));
  };

  const cellPad = dense ? "px-2.5 py-1.5" : "px-3 py-2.5";

  return (
    <div className="gs-scroll overflow-auto rounded-xl border border-black/[0.06]" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-[12.5px]">
        <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
          <tr style={{ background: headerColor, color: "#fff" }}>
            {columns.map((c) => {
              const isSorted = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  className={`${cellPad} text-${c.align ?? "left"} text-[11px] font-semibold uppercase tracking-wide ${c.sortable ? "cursor-pointer select-none hover:bg-black/10" : ""}`}
                  style={{ width: c.width }}
                  title={c.headerHint}
                >
                  <span className={`inline-flex items-center gap-1 ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                    {c.header}
                    {c.sortable && (isSorted ? sort!.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={11} className="opacity-50" />)}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const key = getKey(r);
            const isActive = activeKey != null && key === activeKey;
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(r)}
                className={`transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                style={{ background: isActive ? withAlpha(headerColor, 0.1) : i % 2 ? "#f8fafc" : "#ffffff", boxShadow: isActive ? `inset 0 0 0 2px ${headerColor}` : undefined }}
              >
                {columns.map((c) => {
                  const t = c.heat?.(r);
                  const bg = t != null ? heatBg(t, c.heatScale ?? "gyr", c.heatColor ?? "#4f46e5") : undefined;
                  return (
                    <td key={c.key} className={`${cellPad} text-${c.align ?? "left"} align-middle`} style={bg ? { background: bg } : undefined}>
                      {c.render(r, i)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-grey">
                No rows to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
