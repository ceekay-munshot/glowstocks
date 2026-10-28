"use client";

import { useElementWidth, useTip, ChartFrame } from "./ChartBase";

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  note?: string;
}

/** One horizontal 100%-stacked bar — a compact part-to-whole strip. */
export function StackedBar({ segments, format, height = 42 }: { segments: StackSegment[]; format: (n: number) => string; height?: number }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;

  let x = 0;
  const parts = segments.map((s) => {
    const w = (s.value / total) * width;
    const seg = { ...s, x, w, frac: s.value / total };
    x += w;
    return seg;
  });

  const moveTip = (e: React.MouseEvent, s: (typeof parts)[number]) => {
    const rect = ref.current?.getBoundingClientRect();
    show(rect ? e.clientX - rect.left : 0, rect ? e.clientY - rect.top : 0, {
      title: s.label,
      color: s.color,
      rows: [
        { label: "Value", value: format(s.value) },
        { label: "Share", value: `${(s.frac * 100).toFixed(1)}%` },
      ],
      note: s.note,
    });
  };

  return (
    <ChartFrame innerRef={ref} tip={tip} width={width}>
      <svg width={width} height={height} role="img">
        {parts.map((s, i) => (
          <g key={s.key} onMouseMove={(e) => moveTip(e, s)} onMouseLeave={hide} style={{ cursor: "default" }}>
            <rect
              className="anim-bar-h"
              style={{ animationDelay: `${i * 60}ms`, transformOrigin: `${s.x}px center` }}
              x={s.x}
              y={0}
              width={Math.max(0, s.w - 2)}
              height={height}
              rx={6}
              fill={s.color}
            />
            {s.w > 42 && (
              <text x={s.x + s.w / 2} y={height / 2 + 4} textAnchor="middle" className="tnum" fontSize={11} fontWeight={700} fill="#fff">
                {(s.frac * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}
