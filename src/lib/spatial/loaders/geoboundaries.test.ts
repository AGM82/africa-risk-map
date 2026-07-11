import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadGeoBoundariesAdm1 } from "@/lib/spatial/loaders/geoboundaries";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("loadGeoBoundariesAdm1", () => {
  it("normalises ADM1 polygons and skips invalid features", () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, "geoboundaries-adm1-sample.geojson"), "utf8"),
    ) as unknown;
    const { records, stats } = loadGeoBoundariesAdm1(raw);

    expect(stats).toEqual({ accepted: 2, skipped: 2 });
    expect(records[0]).toMatchObject({
      externalId: "ZAF-ADM1-1",
      name: "Gauteng",
      isoCountry: "ZAF",
      shapeType: "ADM1",
      source: "geoboundaries",
    });
    expect(records[0]?.geomWkt).toMatch(/^MULTIPOLYGON\(\(\(/);
    expect(records[1]).toMatchObject({
      externalId: "NGA-ADM1-NE",
      name: "Borno",
      isoCountry: "NGA",
    });
  });

  it("throws when the root document is not a FeatureCollection", () => {
    expect(() => loadGeoBoundariesAdm1({ type: "Feature" })).toThrow();
  });
});
