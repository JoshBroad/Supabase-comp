import type { ParsedFile } from "../graph/state.js";

export function parseText(filename: string, content: string): ParsedFile {
  const lines = content.split("\n").filter((l) => l.trim());

  // Detect delimiter: tab or pipe
  let delimiter = "\t";
  let commentPrefix = "#";

  // Check if pipe-delimited
  const nonCommentLines = lines.filter((l) => !l.startsWith(commentPrefix));
  if (nonCommentLines.length > 0) {
    const pipeCount = (nonCommentLines[0].match(/\|/g) || []).length;
    const tabCount = (nonCommentLines[0].match(/\t/g) || []).length;
    if (pipeCount > tabCount) delimiter = "|";
  }

  // Find header line — first non-comment line, or comment line that looks like headers
  let headerLine: string | null = null;
  let dataStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(commentPrefix)) {
      // Check if this comment contains delimited column names
      const stripped = line.replace(/^#+\s*/, "");
      const parts = stripped.split(delimiter);
      if (parts.length >= 3) {
        headerLine = stripped;
      }
      dataStartIndex = i + 1;
    } else {
      if (!headerLine) {
        headerLine = line;
        dataStartIndex = i + 1;
      }
      break;
    }
  }

  const headers = headerLine
    ? headerLine.split(delimiter).map((h) => h.trim())
    : [];

  const dataLines = lines.slice(dataStartIndex).filter(
    (l) => !l.startsWith(commentPrefix) && l.trim()
  );

  const records = dataLines.map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i] || "";
    });
    return record;
  });

  return {
    filename,
    format: "text",
    headers,
    sampleRows: records.slice(0, 10),
    rowCount: records.length,
    rawPreview: content.substring(0, 500),
  };
}
