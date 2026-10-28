"use client";

import { useElementWidth, useTip, ChartFrame, Legend } from "./ChartBase";
import { niceTicks, linScale } from "@/lib/chartMath";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}
export interface GroupDatum {
  label: string;
  values: Record<string, number | null>;
}

/** Grouped vertical columns (categories × series), one Y axis + legend. */
export function GroupedColumns({
  groups,
  series,
  format,
  height = 280,
  yAxisFormat,
  axisTicks = 4,
}: {
  groups: GroupDatum[];
  series: SeriesDef[];
  format: (n: number) => string;
  height?: number;
  yAxisFormat?: (n: number) => string;
  axisTicks?: number;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();

  const padTop = 16;
  const axisH = 24;
  const yAxisW = 48;
  const plotH = height - padTop - axisH;
  const plotLeft = yAxisW;
  const plotRight = width - 10;
  const plotW = Math.max(40, plotRight - plotLeft);
  const baseY = padTop + plotH;

  const all = groups.flatMap((g) => series.map((s) => g.values[s.key]).filter((v): v is number => v != null));
  const { ticks, niceMax } = niceTicks(Math.max(1, ...all), axisTicks);
  const y = linScale(0, niceMax, baseY, padTop);
  const fmtY = yAxisFormat ?? format;

  const n = groups.length || 1;
  const slot = plotW / n;
  const groupW = Math.min(slot * 0.72, 140);
  const barW = Math.max(5, Math.min(26, groupW / series.length - 3));

  const moveTip = (e: React.MouseEvent, g: GroupDatum) => {
    const rect = ref.current?.getBoundingClientRect();
    show(rect ? e.clientX - rect.left : 0, rect ? e.clientY - rect.top : 0, {
      title: g.label,
      color: series[0].color,
      rows: series.map((s) => ({
        label: s.label,
        value: g.values[s.key] != null ? format(g.values[s.key] as number) : "n/a",
        color: s.color,
      })),
    });
  };

  return (
    <div>
      <ChartFrame innerRef={ref} tip={tip} width={width}>
        <svg width={width} height={height} role="img">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={plotLeft} x2={plotRight} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef1f6"} strokeWidth={1} />
              <text x={plotLeft - 6} y={y(t) + 3} textAnchor="end" className="tnum" fontSize={10} fill="#94a3b8">
                {fmtY(t)}
              </text>
            </g>
          ))}
          {groups.map((g, gi) => {
            const cx = plotLeft + slot * gi + slot / 2;
            const startX = cx - (barW * series.length + 3 * (series.length - 1)) / 2;
            return (
              <g key={g.label} onMouseMove={(e) => moveTip(e, g)} onMouseLeave={hide} style={{ cursor: "default" }}>
                <rect x={cx - slot / 2} y={padTop} width={slot} height={plotH} fill="transparent" />
                {series.map((s, si) => {
                  const v = g.values[s.key];
                  if (v == null) return null;
                  const x = startX + si * (barW + 3);
                  const h = Math.max(1, baseY - y(v));
                  return (
                    <rect key={s.key} className="anim-bar-v" style={{ animationDelay: `${gi * 40 + si * 20}ms` }} x={x} y={y(v)} width={barW} height={h} rx={3} fill={s.color} />
                  );
                })}
                <text x={cx} y={height - 7} textAnchor="middle" fontSize={10} fill="#94a3b8">
                  {g.label}
                </text>
              </g>
            );
          })}
        </svg>
      </ChartFrame>
      <Legend className="mt-2 justify-center" items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}
