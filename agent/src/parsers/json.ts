import type { ParsedFile } from "../graph/state.js";

export function parseJson(filename: string, content: string): ParsedFile {
  // Remove BOM if present
  let cleanContent = content.trim();
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.slice(1);
  }

  // Basic comment stripping (// and /* */)
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

  let records: any[] = [];

  if (Array.isArray(data)) {
    records = data;
  } else if (typeof data === "object" && data !== null) {
    // Check if it's a wrapper object
    const keys = Object.keys(data);
    
    // Heuristic: if there's a key like "data", "items", "results", "rows" that is an array, use it
    const candidateKeys = ["data", "items", "results", "rows", "records", "value"];
    let foundArray = false;
    
    for (const key of candidateKeys) {
      if (Array.isArray(data[key])) {
        records = data[key];
        foundArray = true;
        break;
      }
    }
    
    // If not found by name, check if there is exactly one key that is an array
    if (!foundArray) {
      const arrayKeys = keys.filter(k => Array.isArray(data[k]));
      if (arrayKeys.length === 1) {
        records = data[arrayKeys[0]];
        foundArray = true;
      }
    }
    
    // If still not found, treat the object itself as a single record
    if (!foundArray) {
      records = [data];
    }
  } else {
    // Primitive value?
    records = [];
  }

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
