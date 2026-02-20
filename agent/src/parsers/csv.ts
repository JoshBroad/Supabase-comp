import { parse } from "csv-parse/sync";
import type { ParsedFile } from "../graph/state.js";

export function parseCsv(filename: string, content: string): ParsedFile {
  let cleanContent = content.trim();
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.slice(1);
  }

  const lines = cleanContent.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    return {
      filename,
      format: "csv",
      headers: [],
      sampleRows: [],
      rowCount: 0,
      rawPreview: "",
    };
  }

  const firstHeader = lines[0].trim();
  
  // Detect delimiter (comma, semicolon, tab)
  const delimiters = [",", ";", "\t"];
  let detectedDelimiter = ",";
  let maxCount = 0;
  
  for (const d of delimiters) {
    const count = (firstHeader.match(new RegExp(`\\${d}`, "g")) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = d;
    }
  }

  // Remove duplicate header rows (generic approach)
  // We compare normalized lines to the first header
  const firstHeaderNormalized = firstHeader.toLowerCase().replace(/\s/g, "");
  
  const cleanedLines = [
    lines[0], // Keep the first header
    ...lines.slice(1).filter((l) => {
      const lineNormalized = l.trim().toLowerCase().replace(/\s/g, "");
      // If line is identical to header, skip it
      return lineNormalized !== firstHeaderNormalized;
    }),
  ];

  const records = parse(cleanedLines.join("\n"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    delimiter: detectedDelimiter,
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
