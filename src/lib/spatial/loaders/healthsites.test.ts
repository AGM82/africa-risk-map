import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadHealthsitesGeoJson } from "@/lib/spatial/loaders/healthsites";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("loadHealthsitesGeoJson", () => {
  it("parses health facilities and skips invalid features", () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, "healthsites-sample.geojson"), "utf8"),
    ) as unknown;
    const { records, stats } = loadHealthsitesGeoJson(raw);

    expect(stats).toEqual({ accepted: 2, skipped: 2 });
    expect(records[0]).toMatchObject({
      externalId: "hs-1",
      name: "Chris Hani Baragwanath Hospital",
      isoCountry: "ZAF",
      amenity: "hospital",
      source: "healthsites",
      geomWkt: "POINT(27.938 -26.261)",
    });
    expect(records[1]).toMatchObject({
      externalId: "999001",
      isoCountry: "KEN",
    });
  });
});
