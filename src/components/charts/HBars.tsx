"use client";

import { useElementWidth, useTip, ChartFrame, type TipRow } from "./ChartBase";
import { niceTicks, linScale } from "@/lib/chartMath";

export interface HBarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
  valueLabel?: string;
  sublabel?: string;
  note?: string;
  tipRows?: TipRow[];
}

/** Horizontal bars with a label column — ordered, value at the tip. One axis. */
export function HBars({
  data,
  format,
  barSize = 26,
  labelWidth = 150,
  maxValue,
  onClick,
}: {
  data: HBarDatum[];
  format: (n: number) => string;
  barSize?: number;
  labelWidth?: number;
  maxValue?: number;
  onClick?: (d: HBarDatum) => void;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();

  const rowGap = 14;
  const rowH = barSize + rowGap;
  const height = Math.max(rowH, data.length * rowH + 8);
  const plotLeft = labelWidth;
  const plotRight = width - 54;
  const plotW = Math.max(30, plotRight - plotLeft);

  const rawMax = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const { niceMax } = niceTicks(rawMax, 4);
  const x = linScale(0, niceMax, plotLeft, plotLeft + plotW);

  const moveTip = (e: React.MouseEvent, d: HBarDatum) => {
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
        {data.map((d, i) => {
          const cy = i * rowH + rowH / 2;
          const bw = Math.max(2, x(d.value) - plotLeft);
          return (
            <g
              key={d.key}
              onMouseMove={(e) => moveTip(e, d)}
              onMouseLeave={hide}
              onClick={onClick ? () => onClick(d) : undefined}
              style={{ cursor: onClick ? "pointer" : "default" }}
            >
              <rect x={0} y={cy - rowH / 2} width={width} height={rowH} fill="transparent" />
              <text x={0} y={cy - (d.sublabel ? 3 : -4)} fontSize={12} fontWeight={600} fill="#334155">
                {d.label.length > 24 ? d.label.slice(0, 23) + "…" : d.label}
              </text>
              {d.sublabel && (
                <text x={0} y={cy + 11} fontSize={10} fill="#94a3b8">
                  {d.sublabel}
                </text>
              )}
              <rect x={plotLeft} y={cy - barSize / 2} width={plotW} height={barSize} rx={5} fill="#f1f5f9" />
              <rect className="anim-bar-h" style={{ animationDelay: `${i * 45}ms` }} x={plotLeft} y={cy - barSize / 2} width={bw} height={barSize} rx={5} fill={d.color} />
              <text x={plotLeft + bw + 6} y={cy + 4} className="tnum" fontSize={11.5} fontWeight={700} fill={d.color}>
                {d.valueLabel ?? format(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
