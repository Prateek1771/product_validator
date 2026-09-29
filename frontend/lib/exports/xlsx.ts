// Excel workbook: one sheet per TableSpec from lib/report-model, with typed number formats and live source links.
import { tablesFor } from "../report-model";
import type { Change, Report, Source } from "../types";

export async function build(report: Report, changes: Change[], sources: Source[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MKT·INTEL";
  wb.created = new Date();
  const used = new Set<string>();
  for (const t of tablesFor(report, changes, sources)) {
    let name = t.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
    while (used.has(name)) name = name.slice(0, 29) + "_" + used.size;
    used.add(name);
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(t.columns);
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FF111418" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1E3C2" } };
    for (const row of t.rows) {
      const r = ws.addRow(row.map((v, j) => {
        const kind = t.kinds?.[j];
        if (kind === "url" && typeof v === "string" && v.startsWith("http")) return { text: v, hyperlink: v };
        if (kind === "pct" && typeof v === "number") return v / 100;
        return v ?? "";
      }));
      t.kinds?.forEach((k, j) => {
        const cell = r.getCell(j + 1);
        if (k === "usd") cell.numFmt = '"$"#,##0.00';
        else if (k === "pct") cell.numFmt = "0.0%";
        else if (k === "int") cell.numFmt = "0";
        else if (k === "url" && cell.value && typeof cell.value === "object") cell.font = { color: { argb: "FF0A67A6" }, underline: true };
      });
    }
    ws.columns.forEach((col, j) => {
      const longest = Math.max(t.columns[j]?.length ?? 8, ...t.rows.map((r) => String(r[j] ?? "").length));
      col.width = Math.min(60, Math.max(10, longest + 2));
      col.alignment = { vertical: "top", wrapText: longest > 60 };
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
