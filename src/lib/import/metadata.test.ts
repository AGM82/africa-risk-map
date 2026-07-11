import { describe, expect, it } from "vitest";
import { buildWorkbookImportMetadata } from "@/lib/import/metadata";

describe("buildWorkbookImportMetadata", () => {
  it("records source, timestamp, checksum, and row count", () => {
    const at = new Date("2026-07-01T00:00:00.000Z");
    const meta = buildWorkbookImportMetadata({
      source: "risk-rating-table",
      lastImportedAt: at,
      payload: "fixture",
      rowCount: 62,
    });
    expect(meta.source).toBe("risk-rating-table");
    expect(meta.lastImportedAt).toEqual(at);
    expect(meta.rowCount).toBe(62);
    expect(meta.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
