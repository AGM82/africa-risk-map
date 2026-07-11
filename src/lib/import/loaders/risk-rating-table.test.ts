import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadRiskRatingTable } from "@/lib/import/loaders/risk-rating-table";
import type { SheetGridFixture } from "@/lib/import/types";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("loadRiskRatingTable", () => {
  it("normalises territory rows and skips invalid records", () => {
    const grid = JSON.parse(
      readFileSync(join(fixtureDir, "risk-rating-table-sample.json"), "utf8"),
    ) as SheetGridFixture;
    const { records, stats } = loadRiskRatingTable(grid);

    expect(stats).toEqual({ accepted: 3, skipped: 2 });
    expect(records[0]).toMatchObject({
      country: "South Africa",
      graaPresence: true,
      countryHeadcount: 1200,
      riskCategory: "Low",
      benefitOptions: "CATEGORIES_1_2",
      evacuationFeasible: true,
    });
    expect(records[1]).toMatchObject({
      country: "Nigeria",
      subRegion: "North-East",
      riskCategory: "Very High",
      benefitOptions: "CATEGORY_4_ONLY",
      evacuationFeasible: false,
    });
    expect(records[2]).toMatchObject({
      country: "Somalia",
      subRegion: "Puntland",
      graaPresence: false,
      benefitOptions: "DECLINE",
      evacuationFeasible: false,
    });
  });
});
