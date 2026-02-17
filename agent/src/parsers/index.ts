import { parseCsv } from "./csv.js";
import { parseJson } from "./json.js";
import { parseXml } from "./xml.js";
import { parseText } from "./text.js";
import type { ParsedFile } from "../graph/state.js";

export function parseFile(filename: string, content: string): ParsedFile {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "csv":
      return parseCsv(filename, content);
    case "json":
      return parseJson(filename, content);
    case "xml":
      return parseXml(filename, content);
    case "txt":
      return parseText(filename, content);
    default:
      // Try JSON first, then CSV, then text
      try {
        return parseJson(filename, content);
      } catch {
        try {
          return parseCsv(filename, content);
        } catch {
          return parseText(filename, content);
        }
      }
  }
}
