// ECharts option builders. Every chart obeys the dataviz skill: ONE axis per
// chart (never dual-axis), thin marks (≤24px bars, rounded data-ends, 2px lines,
// ≥8px markers), recessive hairline gridlines, a legend for ≥2 series, a
// crosshair/rich tooltip, and text in ink tokens (never the series color).

import type { EChartsOption } from "echarts";
import type {
  FinancialYear,
  Geography,
  Segment,
} from "@/lib/types/report";
import { SERIES, INK, seriesColor } from "@/lib/palette";
import { axisCr, fmtCr, fmtPct, indianGroup, num } from "@/lib/format";

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const baseGrid = { left: 8, right: 16, top: 28, bottom: 8, containLabel: true };
const axisLabel = { color: INK.muted, fontFamily: FONT, fontSize: 11 };
const splitLine = { lineStyle: { color: INK.grid, width: 1, type: "solid" as const } };
const axisLine = { lineStyle: { color: INK.axis } };

const barItem = { borderRadius: [3, 3, 0, 0] as [number, number, number, number] };

/** 5-year absolute financials: grouped bars (Revenue / EBITDA / PAT), one ₹-axis. */
export function financialsBarsOption(history: FinancialYear[]): EChartsOption {
  const periods = history.map((y) => y.period);
  const mk = (pick: (y: FinancialYear) => number | null) =>
    history.map((y) => pick(y));
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => (typeof v === "number" ? fmtCr(v) : "—"),
    },
    legend: { bottom: 0, textStyle: { color: INK.secondary, fontFamily: FONT }, itemWidth: 12, itemHeight: 12 },
    grid: { ...baseGrid, bottom: 28 },
    xAxis: { type: "category", data: periods, axisLabel, axisLine, axisTick: { show: false } },
    yAxis: {
      type: "value",
      axisLabel: { ...axisLabel, formatter: (v: number) => `₹${axisCr(v)}` },
      splitLine,
      axisLine: { show: false },
    },
    series: [
      { name: "Revenue", type: "bar", data: mk((y) => num(y.revenue)), itemStyle: { color: SERIES[0], ...barItem }, barMaxWidth: 22 },
      { name: "EBITDA", type: "bar", data: mk((y) => num(y.ebitda ?? null)), itemStyle: { color: SERIES[1], ...barItem }, barMaxWidth: 22 },
      { name: "PAT", type: "bar", data: mk((y) => num(y.pat)), itemStyle: { color: SERIES[2], ...barItem }, barMaxWidth: 22 },
    ],
  };
}

/** 5-year margins: 2px lines (EBITDA margin % / PAT margin %), one %-axis. */
export function marginsLineOption(history: FinancialYear[]): EChartsOption {
  const periods = history.map((y) => y.period);
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross", label: { backgroundColor: INK.secondary } },
      valueFormatter: (v) => (typeof v === "number" ? fmtPct(v) : "—"),
    },
    legend: { bottom: 0, textStyle: { color: INK.secondary, fontFamily: FONT }, itemWidth: 12, itemHeight: 12 },
    grid: { ...baseGrid, right: 48, bottom: 28 },
    xAxis: { type: "category", data: periods, boundaryGap: false, axisLabel, axisLine, axisTick: { show: false } },
    yAxis: { type: "value", axisLabel: { ...axisLabel, formatter: (v: number) => `${v}%` }, splitLine, axisLine: { show: false } },
    series: [
      {
        name: "EBITDA margin",
        type: "line",
        smooth: true,
        data: history.map((y) => num(y.ebitda_margin ?? null)),
        lineStyle: { width: 2, color: SERIES[0] },
        itemStyle: { color: SERIES[0] },
        symbolSize: 8,
        endLabel: { show: true, color: INK.secondary, fontFamily: FONT, formatter: (p: any) => (typeof p.value === "number" ? `${p.value.toFixed(1)}%` : "") },
      },
      {
        name: "PAT margin",
        type: "line",
        smooth: true,
        data: history.map((y) => num(y.pat_margin ?? null)),
        lineStyle: { width: 2, color: SERIES[2] },
        itemStyle: { color: SERIES[2] },
        symbolSize: 8,
        endLabel: { show: true, color: INK.secondary, fontFamily: FONT, formatter: (p: any) => (typeof p.value === "number" ? `${p.value.toFixed(1)}%` : "") },
      },
    ],
  };
}

/** Segment revenue mix: donut (part-to-whole). Legend + labels satisfy relief. */
export function segmentsDonutOption(segments: Segment[]): EChartsOption {
  const data = segments
    .filter((s) => s.pct_revenue?.available && typeof s.pct_revenue.value === "number")
    .map((s, i) => ({
      name: s.name,
      value: s.pct_revenue.value as number,
      itemStyle: { color: seriesColor(i), borderColor: INK.surface, borderWidth: 2 },
    }));
  return {
    textStyle: { fontFamily: FONT },
    tooltip: { trigger: "item", formatter: (p: any) => `${p.name}<br/><b>${p.value}%</b> of revenue` },
    legend: { type: "scroll", bottom: 0, textStyle: { color: INK.secondary, fontFamily: FONT }, itemWidth: 12, itemHeight: 12 },
    series: [
      {
        name: "Revenue mix",
        type: "pie",
        radius: ["45%", "72%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderRadius: 4 },
        label: { color: INK.secondary, fontFamily: FONT, formatter: "{b}\n{c}%", fontSize: 11 },
        labelLine: { length: 8, length2: 8 },
        data,
      },
    ],
  };
}

/** Geography mix: horizontal bars (single series → no legend), value at tip. */
export function geographyBarsOption(geos: Geography[]): EChartsOption {
  const rows = geos
    .filter((g) => g.pct_revenue?.available && typeof g.pct_revenue.value === "number")
    .map((g) => ({ region: g.region, value: g.pct_revenue.value as number, driver: g.driver, risk: g.risk }))
    .sort((a, b) => a.value - b.value);
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number; dataIndex: number }>)[0];
        const r = rows[p.dataIndex];
        return `${p.name}<br/><b>${p.value}%</b> of revenue${r?.driver ? `<br/>Driver: ${r.driver}` : ""}${r?.risk ? `<br/>Risk: ${r.risk}` : ""}`;
      },
    },
    grid: { ...baseGrid, left: 8, right: 44 },
    xAxis: { type: "value", max: 100, axisLabel: { ...axisLabel, formatter: (v: number) => `${v}%` }, splitLine, axisLine: { show: false } },
    yAxis: { type: "category", data: rows.map((r) => r.region), axisLabel: { ...axisLabel, color: INK.secondary }, axisLine, axisTick: { show: false } },
    series: [
      {
        type: "bar",
        data: rows.map((r) => r.value),
        itemStyle: { color: SERIES[0], borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 20,
        label: { show: true, position: "right", color: INK.secondary, fontFamily: FONT, formatter: (p: any) => `${p.value}%` },
      },
    ],
  };
}

/** Scenario upside: diverging bars (bear/base/bull), one %-axis. */
export function scenarioUpsideOption(
  rows: { name: string; upside: number | null }[],
): EChartsOption {
  const data = rows.map((r) => ({
    value: r.upside,
    itemStyle: { color: (r.upside ?? 0) >= 0 ? SERIES[0] : SERIES[7], borderRadius: [3, 3, 0, 0] },
  }));
  return {
    textStyle: { fontFamily: FONT },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => (typeof v === "number" ? `${v > 0 ? "+" : ""}${v}%` : "—") },
    grid: { ...baseGrid, bottom: 8 },
    xAxis: { type: "category", data: rows.map((r) => r.name), axisLabel: { ...axisLabel, color: INK.secondary }, axisLine, axisTick: { show: false } },
    yAxis: { type: "value", axisLabel: { ...axisLabel, formatter: (v: number) => `${v}%` }, splitLine, axisLine: { show: false } },
    series: [
      {
        type: "bar",
        data,
        barMaxWidth: 36,
        label: { show: true, position: "top", color: INK.secondary, fontFamily: FONT, formatter: (p: any) => (typeof p.value === "number" ? `${p.value > 0 ? "+" : ""}${p.value}%` : "") },
      },
    ],
  };
}

export { indianGroup };
