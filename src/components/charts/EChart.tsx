"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import { ChartSkeleton } from "../states";

// echarts needs the DOM — load it client-only so it never runs during SSR.
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export function EChart({ option, height = 260 }: { option: EChartsOption; height?: number }) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
    />
  );
}
