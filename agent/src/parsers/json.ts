import type { ParsedFile } from "../graph/state.js";

export function parseJson(filename: string, content: string): ParsedFile {
  const data = JSON.parse(content);
  const records = Array.isArray(data) ? data : [data];

  // Collect all unique keys across all records
  const headerSet = new Set<string>();
  for (const record of records) {
    if (typeof record === "object" && record !== null) {
      for (const key of Object.keys(record)) {
        headerSet.add(key);
      }
    }
  }

  return {
    filename,
    format: "json",
    headers: Array.from(headerSet),
    sampleRows: records.slice(0, 10),
    rowCount: records.length,
    rawPreview: content.substring(0, 500),
  };
}
