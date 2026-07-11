import { createHash } from "node:crypto";
import {
  SPATIAL_SOURCES,
  type SpatialSource,
  type SpatialSourceMetadata,
} from "@/lib/spatial/types";

export type BuildRefreshInput = Readonly<{
  source: SpatialSource;
  lastRefreshedAt?: Date;
  /** Raw payload used to compute an optional checksum (UTF-8). */
  payload?: string;
  rowCount?: number;
  checksum?: string;
}>;

/**
 * Builds a `SpatialDatasetRefresh` payload: source key, refresh timestamp,
 * optional checksum (SHA-256 hex of `payload`, or an explicit `checksum`),
 * and optional accepted row count.
 */
export function buildSpatialRefreshMetadata(input: BuildRefreshInput): SpatialSourceMetadata {
  if (!SPATIAL_SOURCES.includes(input.source)) {
    throw new RangeError(`Unknown spatial source: ${String(input.source)}`);
  }

  const meta: {
    source: SpatialSource;
    lastRefreshedAt: Date;
    checksum?: string;
    rowCount?: number;
  } = {
    source: input.source,
    lastRefreshedAt: input.lastRefreshedAt ?? new Date(),
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
