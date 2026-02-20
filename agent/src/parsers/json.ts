import type { ParsedFile } from "../graph/state.js";

export function parseJson(filename: string, content: string): ParsedFile {
  // Remove BOM if present
  let cleanContent = content.trim();
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.slice(1);
  }

  // Basic comment stripping (// and /* */) - simplistic regex approach
  // This is not perfect but handles simple cases often found in "JSON" config files
  cleanContent = cleanContent
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");

  let data;
  try {
    data = JSON.parse(cleanContent);
  } catch (e) {
    // If strict parse fails, try to be lenient with trailing commas
    try {
      // Replace trailing commas before } or ]
      const lenient = cleanContent.replace(/,\s*([\]}])/g, "$1");
      data = JSON.parse(lenient);
    } catch {
      throw e; // Throw original error if lenient parse also fails
    }
  }

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
