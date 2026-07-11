import ExcelJS from "exceljs";
import type { SheetGridFixture } from "@/lib/import/types";

export type SheetGrid = SheetGridFixture;

/**
 * Normalises a header cell for case-insensitive column lookup.
 */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Maps a header row + data rows to plain string record objects keyed by
 * normalised header names.
 */
export function gridToRecords(grid: SheetGrid): Record<string, string>[] {
  const headers = grid.headers.map(normalizeHeader);
  return grid.rows.map((row) => {
    const pairs: Array<[string, string]> = [];
    headers.forEach((key, index) => {
      if (key === "") {
        return;
      }
      pairs.push([key, (row.at(index) ?? "").trim()]);
    });
    return Object.fromEntries(pairs);
  });
}

/**
 * Reads an Excel buffer into a header + string-row grid (first sheet or named).
 */
export async function readExcelSheetGrid(
  buffer: Buffer | ArrayBuffer,
  sheetName?: string,
): Promise<SheetGrid> {
  const workbook = new ExcelJS.Workbook();
  const bytes = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : new Uint8Array(buffer);
  await workbook.xlsx.load(bytes.buffer);
  const sheet = sheetName !== undefined ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (sheet === undefined) {
    throw new Error(`Worksheet not found: ${sheetName ?? "(first worksheet)"}`);
  }

  const allRows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const raw = row.values;
    const values = Array.isArray(raw) ? raw.slice(1) : [];
    allRows.push(values.map(cellValueToString));
  });

  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerRow = allRows[0];
  if (headerRow === undefined) {
    return { headers: [], rows: [] };
  }

  return {
    headers: headerRow,
    rows: allRows.slice(1),
  };
}

/**
 * Builds an in-memory workbook buffer for tests (no committed binary fixtures).
 */
export async function buildExcelBuffer(
  sheets: Readonly<Record<string, SheetGrid>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, grid] of Object.entries(sheets)) {
    const ws = workbook.addWorksheet(name);
    ws.addRow([...grid.headers]);
    for (const row of grid.rows) {
      ws.addRow([...row]);
    }
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("result" in value) {
      return cellValueToString(value.result ?? "");
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
  }
  return "";
}

/**
 * Reads the first matching string value from a row using header aliases.
 */
export function pickCell(row: Record<string, string>, ...aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value !== undefined && value !== "") {
      return value;
    }
  }
  return undefined;
}

/**
 * Parses a workbook boolean/flag cell (Y/N, Yes/No, 1/0, TRUE/FALSE).
 */
export function parseYesNo(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const v = value.trim().toLowerCase();
  if (v === "y" || v === "yes" || v === "true" || v === "1") {
    return true;
  }
  if (v === "n" || v === "no" || v === "false" || v === "0") {
    return false;
  }
  return undefined;
}

/**
 * Parses a numeric cell; returns undefined for blank or non-finite values.
 */
export function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const cleaned = value.replace(/[,\sR$]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}
