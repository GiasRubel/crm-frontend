import { ReportResult } from "./types";

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** Renders whichever mode the report ran in (row list or grouped aggregate) as CSV text. */
export function reportResultToCsv(result: ReportResult): string {
  if (result.mode === "aggregate") {
    const aliases = result.metricAliases ?? [];
    const header = [result.groupBy ?? "Group", ...aliases];
    const rows = (result.aggregate ?? []).map((r) => [r.groupLabel, ...aliases.map((a) => r.metrics[a] ?? 0)]);
    return toCsv(header, rows);
  }

  const columns = result.columns ?? [];
  const rows = (result.rows ?? []).map((row) => columns.map((c) => row[c] as unknown));
  return toCsv(columns, rows);
}
