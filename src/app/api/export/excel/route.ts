import { NextResponse } from "next/server";
import type { CompanyReport } from "@/lib/types/report";
import { buildWorkbook } from "@/lib/export/excelWorkbook";

export const dynamic = "force-dynamic";

/**
 * Premium, bespoke .xlsx export of the FULL report (all 13 sections). The
 * formatting lives in lib/export/excelWorkbook.ts; this route just builds the
 * workbook from the posted report and streams it back. Reads the CURRENT loaded
 * report, so it works on the committed sample with zero keys.
 */
export async function POST(request: Request) {
  let report: CompanyReport;
  try {
    const body = (await request.json()) as { report?: CompanyReport };
    if (!body.report || !body.report.ticker) throw new Error("no report");
    report = body.report;
  } catch {
    return NextResponse.json({ ok: false, error: "A report body is required." }, { status: 400 });
  }

  const wb = buildWorkbook(report);
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${report.ticker}-glowstocks.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
