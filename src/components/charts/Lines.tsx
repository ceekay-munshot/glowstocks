"use client";

import { useState } from "react";
import { useElementWidth, useTip, ChartFrame, Legend } from "./ChartBase";
import { niceTicks, linScale, linePath, areaPath, polylineLength } from "@/lib/chartMath";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
}

/** One or more lines (one Y axis). Single series shows a soft area fill; a legend
 *  appears for ≥2. Crosshair hover reads the nearest x across all series. */
export function Lines({
  labels,
  series,
  format,
  height = 250,
  yAxisFormat,
  yFromZero = false,
}: {
  labels: string[];
  series: LineSeries[];
  format: (n: number) => string;
  height?: number;
  yAxisFormat?: (n: number) => string;
  yFromZero?: boolean;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const padTop = 16;
  const axisH = 24;
  const yAxisW = 48;
  const plotH = height - padTop - axisH;
  const plotLeft = yAxisW;
  const plotRight = width - 12;
  const plotW = Math.max(40, plotRight - plotLeft);
  const baseY = padTop + plotH;

  const allVals = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const dataMax = Math.max(1, ...allVals);
  const dataMin = Math.min(...(allVals.length ? allVals : [0]));
  const { ticks, niceMax } = niceTicks(dataMax, 4);
  const yLo = yFromZero ? 0 : Math.max(0, dataMin - (dataMax - dataMin) * 0.35 - 0.001);
  const yHi = yFromZero ? niceMax : dataMax + (dataMax - dataMin) * 0.2 + 0.001;
  const yscale = linScale(yLo, yHi, baseY, padTop);
  const fmtY = yAxisFormat ?? format;

  const n = labels.length || 1;
  const xAt = (i: number) => (n === 1 ? plotLeft + plotW / 2 : plotLeft + (i / (n - 1)) * plotW);
  const single = series.length === 1;
  const gridTicks = yFromZero ? ticks : [yLo, (yLo + yHi) / 2, yHi];
  const labelEvery = n > 8 ? Math.ceil(n / 7) : 1;

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    labels.forEach((_, i) => {
      const d = Math.abs(xAt(i) - mx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHoverIdx(best);
    show(xAt(best), padTop + 8, {
      title: labels[best],
      color: series[0].color,
      rows: series.map((s) => ({ label: s.label, value: s.values[best] != null ? format(s.values[best] as number) : "n/a", color: s.color })),
    });
  };

  return (
    <div>
      <ChartFrame innerRef={ref} tip={tip} width={width}>
        <svg width={width} height={height} role="img" onMouseMove={onMove} onMouseLeave={() => { hide(); setHoverIdx(null); }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`gsgrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.26} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {gridTicks.map((t, i) => (
            <g key={i}>
              <line x1={plotLeft} x2={plotRight} y1={yscale(t)} y2={yscale(t)} stroke="#eef1f6" strokeWidth={1} />
              <text x={plotLeft - 6} y={yscale(t) + 3} textAnchor="end" className="tnum" fontSize={10} fill="#94a3b8">
                {fmtY(Math.round(t * 10) / 10)}
              </text>
            </g>
          ))}

          {hoverIdx != null && <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padTop} y2={baseY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />}

          {series.map((s) => {
            const pts = s.values.map((v, i) => (v == null ? null : ([xAt(i), yscale(v)] as [number, number]))).filter((p): p is [number, number] => p != null);
            if (!pts.length) return null;
            return (
              <g key={s.key}>
                {single && pts.length > 1 && <path d={areaPath(pts, baseY)} fill={`url(#gsgrad-${s.key})`} />}
                {pts.length > 1 && (
                  <path className="anim-line" style={{ ["--dash" as string]: polylineLength(pts) }} d={linePath(pts)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                )}
                {s.values.map((v, i) =>
                  v == null ? null : <circle key={i} cx={xAt(i)} cy={yscale(v)} r={hoverIdx === i ? 4.5 : 2.8} fill="#fff" stroke={s.color} strokeWidth={2} style={{ transition: "r 0.1s" }} />,
                )}
              </g>
            );
          })}

          {labels.map((l, i) => (i % labelEvery === 0 ? <text key={i} x={xAt(i)} y={height - 7} textAnchor="middle" fontSize={10} fill="#94a3b8">{l}</text> : null))}
        </svg>
      </ChartFrame>
      {series.length >= 2 && <Legend className="mt-2 justify-center" items={series.map((s) => ({ label: s.label, color: s.color }))} />}
    </div>
  );
}
