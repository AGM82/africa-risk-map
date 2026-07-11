import { describe, expect, it } from "vitest";
import {
  dWithinPointParams,
  insertMultiPolygonGeomParams,
  insertPointGeomParams,
  isValidLonLat,
  multiPolygonWkt,
  pointWkt,
  SPATIAL_SRID,
} from "@/lib/db/spatial";

describe("isValidLonLat", () => {
  it("accepts in-range finite coordinates", () => {
    expect(isValidLonLat(28.0473, -26.2041)).toBe(true);
    expect(isValidLonLat(-180, -90)).toBe(true);
    expect(isValidLonLat(180, 90)).toBe(true);
  });

  it("rejects out-of-range, NaN, and infinite values", () => {
    expect(isValidLonLat(181, 0)).toBe(false);
    expect(isValidLonLat(0, -91)).toBe(false);
    expect(isValidLonLat(Number.NaN, 0)).toBe(false);
    expect(isValidLonLat(0, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("pointWkt", () => {
  it("formats a POINT WKT", () => {
    expect(pointWkt(28.0473, -26.2041)).toBe("POINT(28.0473 -26.2041)");
  });

  it("throws on invalid coordinates", () => {
    expect(() => pointWkt(200, 0)).toThrow(RangeError);
  });
});

describe("multiPolygonWkt", () => {
  const closedRing = [
    [28.0, -26.0],
    [28.1, -26.0],
    [28.1, -26.1],
    [28.0, -26.1],
    [28.0, -26.0],
  ] as const;

  it("formats a single-ring MULTIPOLYGON", () => {
    expect(multiPolygonWkt([closedRing])).toBe(
      "MULTIPOLYGON(((28 -26, 28.1 -26, 28.1 -26.1, 28 -26.1, 28 -26)))",
    );
  });

  it("rejects empty, open, or short rings", () => {
    expect(() => multiPolygonWkt([])).toThrow(RangeError);
    expect(() =>
      multiPolygonWkt([
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      ]),
    ).toThrow(RangeError);
    expect(() =>
      multiPolygonWkt([
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    ).toThrow(RangeError);
  });

  it("rejects invalid coordinates inside a ring", () => {
    expect(() =>
      multiPolygonWkt([
        [
          [0, 0],
          [200, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ]),
    ).toThrow(RangeError);
  });
});

describe("SQL fragment helpers", () => {
  it("builds insert point params with SRID 4326", () => {
    const wkt = pointWkt(18.42, -33.92);
    const frag = insertPointGeomParams(wkt);
    expect(frag.text).toContain("ST_GeomFromText");
    expect(frag.values).toEqual([wkt, SPATIAL_SRID]);
  });

  it("builds insert multipolygon params", () => {
    const wkt = multiPolygonWkt([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const frag = insertMultiPolygonGeomParams(wkt);
    expect(frag.values).toEqual([wkt, SPATIAL_SRID]);
  });

  it("builds ST_DWithin params and rejects bad radius", () => {
    const wkt = pointWkt(0, 0);
    expect(dWithinPointParams(wkt, 50_000).values).toEqual([wkt, SPATIAL_SRID, 50_000]);
    expect(() => dWithinPointParams(wkt, -1)).toThrow(RangeError);
  });

  it("rejects non-POINT WKT for point helpers", () => {
    expect(() => insertPointGeomParams("LINESTRING(0 0, 1 1)")).toThrow(RangeError);
  });

  it("rejects non-MULTIPOLYGON WKT for polygon helper", () => {
    expect(() => insertMultiPolygonGeomParams("POINT(0 0)")).toThrow(RangeError);
  });
});
