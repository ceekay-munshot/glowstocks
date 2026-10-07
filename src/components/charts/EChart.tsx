"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import { ChartSkeleton } from "../states";

// echarts needs the DOM — load it client-only so it never runs during SSR.
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

/**
 * `animate={false}` renders the chart with no entry animation — used by the
 * print routes so the canvas is fully drawn by the time the PDF is captured.
 */
export function EChart({
  option,
  height = 260,
  animate = true,
}: {
  option: EChartsOption;
  height?: number;
  animate?: boolean;
}) {
  const opt = animate ? option : { ...option, animation: false, animationDuration: 0 };
  return (
    <ReactECharts
      option={opt}
      notMerge
      lazyUpdate
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
    />
  );
}
