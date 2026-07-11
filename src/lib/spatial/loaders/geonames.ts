import { pointWkt } from "@/lib/db/spatial";
import { parseDelimited } from "@/lib/spatial/parse-csv";
import type { LoadResult, PlaceRecord } from "@/lib/spatial/types";

/**
 * GeoNames dump columns (tab-separated, no header) — subset we care about:
 * 0 geonameid, 1 name, 4 latitude, 5 longitude, 6 feature class,
 * 7 feature code, 8 country code, 14 population.
 *
 * @see https://download.geonames.org/export/dump/readme.txt
 */
const COL = {
  geonameid: 0,
  name: 1,
  latitude: 4,
  longitude: 5,
  featureClass: 6,
  featureCode: 7,
  countryCode: 8,
  population: 14,
} as const;

/**
 * Parses GeoNames TSV dump text (no header) into Place records + Point WKT.
 * Invalid rows are skipped and counted.
 */
export function loadGeoNamesTsv(tsvText: string): LoadResult<PlaceRecord> {
  const rows = parseDelimited(tsvText, { delimiter: "\t", hasHeader: false });
  const records: PlaceRecord[] = [];
  let skipped = 0;

  for (const cells of rows) {
    const externalId = (cells[COL.geonameid] ?? "").trim();
    const name = (cells[COL.name] ?? "").trim();
    const isoCountry = (cells[COL.countryCode] ?? "").trim().toUpperCase();
    const lat = Number.parseFloat(cells[COL.latitude] ?? "");
    const lon = Number.parseFloat(cells[COL.longitude] ?? "");
    const featureClass = emptyToUndefined(cells[COL.featureClass]);
    const featureCode = emptyToUndefined(cells[COL.featureCode]);
    const populationRaw = (cells[COL.population] ?? "").trim();
    const population = populationRaw === "" ? undefined : Number.parseInt(populationRaw, 10);

    if (externalId === "" || name === "" || isoCountry === "") {
      skipped += 1;
      continue;
    }

    try {
      const geomWkt = pointWkt(lon, lat);
      const record: {
        externalId: string;
        name: string;
        isoCountry: string;
        source: "geonames";
        geomWkt: string;
        featureClass?: string;
        featureCode?: string;
        population?: number;
      } = {
        externalId,
        name,
        isoCountry,
        source: "geonames",
        geomWkt,
      };
      if (featureClass !== undefined) {
        record.featureClass = featureClass;
      }
      if (featureCode !== undefined) {
        record.featureCode = featureCode;
      }
      if (population !== undefined && Number.isFinite(population)) {
        record.population = population;
      }
      records.push(record);
    } catch {
      skipped += 1;
    }
  }

  return { records, stats: { accepted: records.length, skipped } };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
