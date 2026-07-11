import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadGeoNamesTsv } from "@/lib/spatial/loaders/geonames";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("loadGeoNamesTsv", () => {
  it("parses places and skips invalid rows", () => {
    const tsv = readFileSync(join(fixtureDir, "geonames-sample.tsv"), "utf8");
    const { records, stats } = loadGeoNamesTsv(tsv);

    expect(stats).toEqual({ accepted: 2, skipped: 2 });
    expect(records[0]).toMatchObject({
      externalId: "953987",
      name: "Johannesburg",
      isoCountry: "ZA",
      featureClass: "P",
      featureCode: "PPLA",
      population: 4434827,
      source: "geonames",
      geomWkt: "POINT(28.04363 -26.20227)",
    });
    expect(records[1]?.name).toBe("Nairobi");
  });
});
