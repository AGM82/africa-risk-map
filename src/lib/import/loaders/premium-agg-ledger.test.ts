import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadPremiumAggLedger } from "@/lib/import/loaders/premium-agg-ledger";
import type { SheetGridFixture } from "@/lib/import/types";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("loadPremiumAggLedger", () => {
  it("parses rate cards and ledger rows with VAT flags", () => {
    const ratesGrid = JSON.parse(
      readFileSync(join(fixtureDir, "premium-agg-rates-sample.json"), "utf8"),
    ) as SheetGridFixture;
    const ledgerGrid = JSON.parse(
      readFileSync(join(fixtureDir, "premium-agg-ledger-sample.json"), "utf8"),
    ) as SheetGridFixture;

    const { rates, ledger, stats } = loadPremiumAggLedger({
      ratesGrid,
      ledgerGrid,
    });

    expect(stats).toEqual({ accepted: 6, skipped: 2 });
    expect(rates[0]).toEqual({
      policyYear: "2025-2026",
      categoryLabel: "Category 1 — Essential Cover",
      planType: "Essential",
      premiumPerPersonPerMonth: 24.06,
      aggregatePerPersonPerMonth: 35,
      premiumIncludesVat: true,
      aggregateExcludesVat: true,
    });
    expect(ledger[1]).toMatchObject({
      month: "2026-01",
      planType: "Essential",
      memberCount: 6503,
      isEndorsement: true,
      endorsementNote: "Add 103 members — sample reserve",
    });
  });
});
