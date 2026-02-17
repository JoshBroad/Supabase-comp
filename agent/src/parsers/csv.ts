import { parse } from "csv-parse/sync";
import type { ParsedFile } from "../graph/state.js";

export function parseCsv(filename: string, content: string): ParsedFile {
  // Handle files with repeated headers (like our messy customers.csv)
  const lines = content.split("\n").filter((l) => l.trim());
  const firstHeader = lines[0];

  // Remove duplicate header rows
  const cleanedLines = [
    firstHeader,
    ...lines.slice(1).filter((l) => {
      const normalized = l.toLowerCase().replace(/[_\s]/g, "");
      const headerNormalized = firstHeader.toLowerCase().replace(/[_\s]/g, "");
      // Skip lines that look like header variations
      const isHeader =
        normalized.startsWith("custid,") ||
        normalized.startsWith("customerid,") ||
        (normalized.includes("first_name") &&
          normalized.includes("last_name") &&
          normalized.includes("email"));
      return !isHeader;
    }),
  ];

  const records = parse(cleanedLines.join("\n"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return {
    filename,
    format: "csv",
    headers,
    sampleRows: records.slice(0, 10),
    rowCount: records.length,
    rawPreview: content.substring(0, 500),
  };
}
