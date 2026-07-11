import { describe, expect, it } from "vitest";
import { buildSpatialRefreshMetadata } from "@/lib/spatial/metadata";

describe("buildSpatialRefreshMetadata", () => {
  it("sets source, timestamp, and optional rowCount", () => {
    const at = new Date("2026-07-01T12:00:00.000Z");
    const meta = buildSpatialRefreshMetadata({
      source: "ourairports",
      lastRefreshedAt: at,
      rowCount: 3,
    });
    expect(meta).toEqual({
      source: "ourairports",
      lastRefreshedAt: at,
      rowCount: 3,
    });
  });

  it("computes a stable SHA-256 checksum from payload", () => {
    const a = buildSpatialRefreshMetadata({
      source: "geonames",
      payload: "hello",
      lastRefreshedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const b = buildSpatialRefreshMetadata({
      source: "geonames",
      payload: "hello",
      lastRefreshedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(a.checksum).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    expect(a.checksum).toBe(b.checksum);
  });

  it("prefers an explicit checksum over hashing payload", () => {
    const meta = buildSpatialRefreshMetadata({
      source: "healthsites",
      payload: "ignored",
      checksum: "abc123",
      lastRefreshedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(meta.checksum).toBe("abc123");
  });

  it("rejects an unknown source key", () => {
    expect(() =>
      buildSpatialRefreshMetadata({
        // @ts-expect-error intentional invalid source
        source: "google-places",
      }),
    ).toThrow(RangeError);
  });
});
