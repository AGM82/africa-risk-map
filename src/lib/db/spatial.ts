/**
 * PostGIS geometry helpers for Africa Risk Map.
 *
 * Prisma has no native geometry type — columns are modelled as
 * Unsupported("geometry(...)") and all spatial I/O goes through
 * parameterised $queryRaw / $executeRaw. See docs/prisma-postgis-geometry.md.
 *
 * This module is pure: it builds WKT strings and SQL fragment descriptors
 * with bound params. It does not open a database connection.
 */

export const SPATIAL_SRID = 4326 as const;

/** Lon/lat in WGS84 degrees. */
export type LonLat = Readonly<{ lon: number; lat: number }>;

/** A closed ring: list of [lon, lat] positions (GeoJSON order). */
export type Ring = ReadonlyArray<readonly [number, number]>;

export type SqlFragment = Readonly<{
  /** Human-readable SQL with $1, $2, … placeholders (for docs/tests). */
  text: string;
  /** Bound parameter values in placeholder order. */
  values: readonly unknown[];
}>;

/**
 * Returns true when lon ∈ [-180, 180], lat ∈ [-90, 90], and both are finite.
 */
export function isValidLonLat(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Builds `POINT(lon lat)` WKT. Throws if coordinates are invalid.
 */
export function pointWkt(lon: number, lat: number): string {
  if (!isValidLonLat(lon, lat)) {
    throw new RangeError(`Invalid lon/lat for POINT: lon=${String(lon)}, lat=${String(lat)}`);
  }
  return `POINT(${formatCoord(lon)} ${formatCoord(lat)})`;
}

/**
 * Builds `MULTIPOLYGON(((...)))` WKT from one or more polygon rings.
 * Each ring must have ≥ 4 positions and be closed (first === last).
 * Outer rings only for this helper — holes are out of scope for ADM1 fixtures.
 * Throws if any coordinate is invalid or a ring is malformed.
 */
export function multiPolygonWkt(rings: ReadonlyArray<Ring>): string {
  if (rings.length === 0) {
    throw new RangeError("MultiPolygon requires at least one ring");
  }
  const polygons = rings.map((ring, index) => {
    if (ring.length < 4) {
      throw new RangeError(
        `Ring ${String(index)} needs ≥ 4 positions (closed); got ${String(ring.length)}`,
      );
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first === undefined || last === undefined || first[0] !== last[0] || first[1] !== last[1]) {
      throw new RangeError(`Ring ${String(index)} must be closed (first === last)`);
    }
    const coords = ring
      .map(([lon, lat]) => {
        if (!isValidLonLat(lon, lat)) {
          throw new RangeError(
            `Invalid lon/lat in ring ${String(index)}: lon=${String(lon)}, lat=${String(lat)}`,
          );
        }
        return `${formatCoord(lon)} ${formatCoord(lat)}`;
      })
      .join(", ");
    return `((${coords}))`;
  });
  return `MULTIPOLYGON(${polygons.join(", ")})`;
}

/**
 * Descriptor for inserting a Point geometry via ST_GeomFromText.
 * Callers pass `values` into Prisma `$executeRaw` / a prepared statement —
 * never interpolate them into the SQL string.
 */
export function insertPointGeomParams(wkt: string): SqlFragment {
  assertPointWkt(wkt);
  return {
    text: "ST_GeomFromText($1, $2)",
    values: [wkt, SPATIAL_SRID],
  };
}

/**
 * Descriptor for inserting a MultiPolygon geometry via ST_GeomFromText.
 */
export function insertMultiPolygonGeomParams(wkt: string): SqlFragment {
  assertMultiPolygonWkt(wkt);
  return {
    text: "ST_GeomFromText($1, $2)",
    values: [wkt, SPATIAL_SRID],
  };
}

/**
 * Descriptor for an ST_DWithin filter on geography (metres).
 * `originWkt` must be a POINT WKT; `radiusMetres` must be a finite ≥ 0 number.
 */
export function dWithinPointParams(originWkt: string, radiusMetres: number): SqlFragment {
  assertPointWkt(originWkt);
  if (!Number.isFinite(radiusMetres) || radiusMetres < 0) {
    throw new RangeError(`radiusMetres must be a finite number ≥ 0; got ${String(radiusMetres)}`);
  }
  return {
    text: "ST_DWithin(geom::geography, ST_GeomFromText($1, $2)::geography, $3)",
    values: [originWkt, SPATIAL_SRID, radiusMetres],
  };
}

function formatCoord(n: number): string {
  // Trim noisy float tails while staying precise enough for map overlays.
  return Number.parseFloat(n.toFixed(7)).toString();
}

function assertPointWkt(wkt: string): void {
  if (!/^POINT\(-?\d/.test(wkt)) {
    throw new RangeError(`Expected POINT(...) WKT; got ${wkt.slice(0, 32)}`);
  }
}

function assertMultiPolygonWkt(wkt: string): void {
  if (!wkt.startsWith("MULTIPOLYGON(")) {
    throw new RangeError(`Expected MULTIPOLYGON(...) WKT; got ${wkt.slice(0, 32)}`);
  }
}
