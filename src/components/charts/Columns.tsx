"use client";

import { useElementWidth, useTip, ChartFrame, type TipRow } from "./ChartBase";
import { niceTicks, linScale } from "@/lib/chartMath";

export interface ColumnDatum {
  key: string;
  label: string;
  value: number;
  color: string;
  valueLabel?: string;
  note?: string;
  tipRows?: TipRow[];
}

/** Single-series vertical columns, one Y axis. Handles negative values (zero baseline). */
export function Columns({
  data,
  format,
  height = 230,
  axisTicks = 4,
  yAxisFormat,
  showValues = false,
}: {
  data: ColumnDatum[];
  format: (n: number) => string;
  height?: number;
  axisTicks?: number;
  yAxisFormat?: (n: number) => string;
  showValues?: boolean;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();

  const padTop = 16;
  const axisH = 24;
  const yAxisW = 46;
  const plotH = height - padTop - axisH;
  const plotLeft = yAxisW;
  const plotRight = width - 10;
  const plotW = Math.max(40, plotRight - plotLeft);
  const baseY = padTop + plotH;

  const vals = data.map((d) => d.value);
  const dMax = Math.max(0, ...vals);
  const dMin = Math.min(0, ...vals);
  const { niceMax } = niceTicks(dMax || 1, axisTicks);
  const niceMin = dMin < 0 ? -niceTicks(-dMin, 2).niceMax : 0;
  const y = linScale(niceMin, niceMax, baseY, padTop);
  const fmtY = yAxisFormat ?? format;
  const zeroY = y(0);

  const gridTicks = Array.from(new Set([niceMin, niceMin / 2, 0, niceMax / 2, niceMax])).filter(
    (t) => t >= niceMin - 1e-9 && t <= niceMax + 1e-9,
  );

  const n = data.length || 1;
  const slot = plotW / n;
  const barW = Math.min(46, Math.max(8, slot * 0.58));

  const moveTip = (e: React.MouseEvent, d: ColumnDatum) => {
    const rect = ref.current?.getBoundingClientRect();
    show(rect ? e.clientX - rect.left : 0, rect ? e.clientY - rect.top : 0, {
      title: d.label,
      color: d.color,
      rows: d.tipRows ?? [{ label: "Value", value: d.valueLabel ?? format(d.value) }],
      note: d.note,
    });
  };

  return (
    <ChartFrame innerRef={ref} tip={tip} width={width}>
      <svg width={width} height={height} role="img">
        {gridTicks.map((t, i) => (
          <g key={i}>
            <line x1={plotLeft} x2={plotRight} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef1f6"} strokeWidth={1} />
            <text x={plotLeft - 6} y={y(t) + 3} textAnchor="end" className="tnum" fontSize={10} fill="#94a3b8">
              {fmtY(Math.round(t * 10) / 10)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = plotLeft + slot * i + slot / 2;
          const yv = y(d.value);
          const top = Math.min(zeroY, yv);
          const h = Math.max(1, Math.abs(yv - zeroY));
          const everyOther = n > 9 ? i % 2 === 0 : true;
          return (
            <g key={d.key} onMouseMove={(e) => moveTip(e, d)} onMouseLeave={hide} style={{ cursor: "default" }}>
              <rect x={cx - slot / 2} y={padTop} width={slot} height={plotH} fill="transparent" />
              <rect className="anim-bar-v" style={{ animationDelay: `${i * 45}ms` }} x={cx - barW / 2} y={top} width={barW} height={h} rx={4} fill={d.color} />
              {showValues && (
                <text x={cx} y={(d.value >= 0 ? top : top + h) - (d.value >= 0 ? 5 : -12)} textAnchor="middle" className="tnum" fontSize={10.5} fontWeight={700} fill={d.color}>
                  {d.valueLabel ?? format(d.value)}
                </text>
              )}
              {everyOther && (
                <text x={cx} y={height - 7} textAnchor="middle" fontSize={10} fill="#94a3b8">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
