import { XMLParser } from "fast-xml-parser";
import type { ParsedFile } from "../graph/state.js";

export function parseXml(filename: string, content: string): ParsedFile {
  let cleanContent = content.trim();
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.slice(1);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });
  const result = parser.parse(content);

  // Find the array of records — usually nested under a root element
  let records: Record<string, any>[] = [];
  function findArray(obj: any): Record<string, any>[] | null {
    if (Array.isArray(obj)) return obj;
    if (typeof obj === "object" && obj !== null) {
      for (const value of Object.values(obj)) {
        const found = findArray(value);
        if (found) return found;
      }
    }
    return null;
  }

  const found = findArray(result);
  if (found) {
    records = found;
  } else if (typeof result === "object") {
    // Single record wrapped in root
    const rootKey = Object.keys(result)[0];
    const inner = result[rootKey];
    if (typeof inner === "object" && !Array.isArray(inner)) {
      const innerKey = Object.keys(inner)[0];
      const items = inner[innerKey];
      records = Array.isArray(items) ? items : [items];
    }
  }

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
    format: "xml",
    headers: Array.from(headerSet),
    sampleRows: records.slice(0, 10),
    rowCount: records.length,
    rawPreview: content.substring(0, 500),
  };
}
