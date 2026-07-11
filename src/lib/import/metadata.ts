import { createHash } from "node:crypto";
import {
  WORKBOOK_SOURCES,
  type WorkbookImportMetadata,
  type WorkbookSource,
} from "@/lib/import/types";

export type BuildWorkbookImportInput = Readonly<{
  source: WorkbookSource;
  lastImportedAt?: Date;
  payload?: string;
  rowCount?: number;
  checksum?: string;
}>;

/**
 * Builds provenance metadata for a workbook import run.
 */
export function buildWorkbookImportMetadata(
  input: BuildWorkbookImportInput,
): WorkbookImportMetadata {
  if (!WORKBOOK_SOURCES.includes(input.source)) {
    throw new RangeError(`Unknown workbook source: ${String(input.source)}`);
  }

  const meta: {
    source: WorkbookSource;
    lastImportedAt: Date;
    checksum?: string;
    rowCount?: number;
  } = {
    source: input.source,
    lastImportedAt: input.lastImportedAt ?? new Date(),
  };

  const checksum =
    input.checksum ?? (input.payload !== undefined ? sha256Hex(input.payload) : undefined);
  if (checksum !== undefined) {
    meta.checksum = checksum;
  }
  if (input.rowCount !== undefined) {
    meta.rowCount = input.rowCount;
  }
  return meta;
}

function sha256Hex(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
