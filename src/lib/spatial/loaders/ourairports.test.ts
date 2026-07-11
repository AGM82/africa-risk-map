import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadOurAirportsCsv } from "@/lib/spatial/loaders/ourairports";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("loadOurAirportsCsv", () => {
  it("parses airports and skips rows with bad coords or missing name", () => {
    const csv = readFileSync(join(fixtureDir, "ourairports-sample.csv"), "utf8");
    const { records, stats } = loadOurAirportsCsv(csv);

    expect(stats).toEqual({ accepted: 2, skipped: 2 });
    expect(records[0]).toMatchObject({
      externalId: "1",
      name: "O.R. Tambo International Airport",
      isoCountry: "ZA",
      iataCode: "JNB",
      icaoCode: "FAOR",
      type: "large_airport",
      source: "ourairports",
      geomWkt: "POINT(28.246 -26.1392)",
    });
    expect(records[1]?.isoCountry).toBe("KE");
  });

  it("returns empty stats for an empty CSV with only a header", () => {
    const { records, stats } = loadOurAirportsCsv(
      "id,ident,type,name,latitude_deg,longitude_deg,iso_country\n",
    );
    expect(records).toEqual([]);
    expect(stats).toEqual({ accepted: 0, skipped: 0 });
  });
});
