/**
 * Minimal CSV / TSV parser for spatial fixtures.
 * Assumes no embedded newlines inside quoted fields (fixture-safe).
 */

export type DelimitedParseOptions = Readonly<{
  delimiter?: string;
  /** When true (default), the first row is headers. */
  hasHeader?: boolean;
}>;

/**
 * Parses a delimited text blob into an array of row objects keyed by header,
 * or into string[][] when `hasHeader` is false.
 */
export function parseDelimited(
  text: string,
  options: DelimitedParseOptions & { hasHeader: false },
): string[][];
export function parseDelimited(
  text: string,
  options?: DelimitedParseOptions,
): Record<string, string>[];
export function parseDelimited(
  text: string,
  options: DelimitedParseOptions = {},
): Record<string, string>[] | string[][] {
  const delimiter = options.delimiter ?? ",";
  const hasHeader = options.hasHeader ?? true;
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const rows = lines.map((line) => splitDelimitedLine(line, delimiter));

  if (!hasHeader) {
    return rows;
  }

  const header = rows[0];
  if (header === undefined) {
    return [];
  }
  return rows.slice(1).map((cells) => {
    const pairs: Array<[string, string]> = [];
    header.forEach((key, i) => {
      if (key === "") {
        return;
      }
      pairs.push([key, cells.at(i) ?? ""]);
    });
    return Object.fromEntries(pairs);
  });
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line.at(i);
    if (ch === '"') {
      const next = line.at(i + 1);
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch ?? "";
  }
  cells.push(current);
  return cells;
}
