import { pointWkt } from "@/lib/db/spatial";
import { parseDelimited } from "@/lib/spatial/parse-csv";
import type { AirportRecord, LoadResult } from "@/lib/spatial/types";

/**
 * Parses OurAirports CSV text into normalised Airport records + Point WKT.
 *
 * Expected columns (subset): id, ident, type, name, latitude_deg, longitude_deg,
 * iso_country, iata_code, icao_code (icao may be absent — `ident` used as fallback).
 *
 * Invalid / missing coordinates or ids are skipped (counted in `stats.skipped`).
 */
export function loadOurAirportsCsv(csvText: string): LoadResult<AirportRecord> {
  const rows = parseDelimited(csvText);
  const records: AirportRecord[] = [];
  let skipped = 0;

  for (const row of rows) {
    const externalId = (row["id"] ?? row["ident"] ?? "").trim();
    const name = (row["name"] ?? "").trim();
    const isoCountry = (row["iso_country"] ?? "").trim().toUpperCase();
    const lon = Number.parseFloat(row["longitude_deg"] ?? "");
    const lat = Number.parseFloat(row["latitude_deg"] ?? "");

    if (externalId === "" || name === "" || isoCountry === "") {
      skipped += 1;
      continue;
    }

    try {
      const geomWkt = pointWkt(lon, lat);
      const iata = emptyToUndefined(row["iata_code"]);
      const icao = emptyToUndefined(row["icao_code"]) ?? emptyToUndefined(row["ident"]);
      const type = emptyToUndefined(row["type"]);

      const record: {
        externalId: string;
        name: string;
        isoCountry: string;
        source: "ourairports";
        geomWkt: string;
        iataCode?: string;
        icaoCode?: string;
        type?: string;
      } = {
        externalId,
        name,
        isoCountry,
        source: "ourairports",
        geomWkt,
      };
      if (iata !== undefined) {
        record.iataCode = iata;
      }
      if (icao !== undefined) {
        record.icaoCode = icao;
      }
      if (type !== undefined) {
        record.type = type;
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
