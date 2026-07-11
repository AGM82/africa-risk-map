import { describe, expect, it } from "vitest";
import type { EndorsementRecord } from "@/lib/org-location/types";
import type { PolicySchedule } from "@/lib/policy/types";
import {
  buildMonthlyBookSeries,
  dashboardInsight,
  policyMonthEnds,
} from "@/lib/reporting/monthly-series";
import { ledgerRowsToCsv, toCsv } from "@/lib/reporting/csv";

const SCHEDULE: PolicySchedule = {
  policy: {
    id: "policy-graa-2025-26",
    clientId: "client-graa",
    policyYear: "2025-2026",
    inceptionDate: new Date("2025-12-01T00:00:00.000Z"),
    expiryDate: new Date("2026-11-30T00:00:00.000Z"),
    status: "ON_RISK",
    benefitScale: "FIXED_SUM",
    paymentTermsId: "pay-graa-monthly",
    underwriterUserId: null,
    brokerOrganisationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  paymentTerms: {
    id: "pay-graa-monthly",
    clientId: "client-graa",
    frequency: "MONTHLY_BY_NUMBERS",
    depositMinPremium: null,
    adjustmentCadenceMonths: null,
    aggregateIsClientFund: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  categories: [
    {
      category: {
        id: "cat-graa-essential",
        policyId: "policy-graa-2025-26",
        clientId: "client-graa",
        categoryLabel: "Category 1 — Essential Cover",
        planType: "ESSENTIAL",
        basisOfCover: "TWENTY_FOUR_HOUR",
        basisOfCoverOther: null,
        declaredInsuredCount: 6503,
        declaredAnnualWageRoll: null,
        premiumAmount: 24.06,
        premiumBasis: "PER_PERSON_PER_MONTH",
        premiumIncludesVat: true,
        aggregateAmount: 35,
        aggregateBasis: "PER_PERSON_PER_MONTH",
        aggregateExcludesVat: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      benefits: [],
    },
  ],
};

function end(
  partial: Pick<EndorsementRecord, "id" | "delta" | "effectiveDate" | "kind">,
): EndorsementRecord {
  return {
    clientId: "client-graa",
    organisationLocationId: "loc-demo-zaf",
    coverCategoryId: "cat-graa-essential",
    policyId: "policy-graa-2025-26",
    note: null,
    createdByUserId: "user-insurer",
    createdAt: partial.effectiveDate,
    ...partial,
  };
}

describe("monthly book series", () => {
  it("emits one point per policy month", () => {
    const ends = policyMonthEnds(
      new Date("2025-12-01T00:00:00.000Z"),
      new Date("2026-11-30T00:00:00.000Z"),
    );
    expect(ends).toHaveLength(12);
  });

  it("steps premium when mid-term ADD takes effect", () => {
    const series = buildMonthlyBookSeries(SCHEDULE, [
      end({
        id: "e1",
        delta: 40,
        effectiveDate: new Date("2025-12-01T00:00:00.000Z"),
        kind: "BASELINE",
      }),
      end({
        id: "e2",
        delta: 10,
        effectiveDate: new Date("2026-03-15T00:00:00.000Z"),
        kind: "ADD",
      }),
    ]);
    const dec = series.find((p) => p.monthKey === "2025-12");
    const mar = series.find((p) => p.monthKey === "2026-03");
    const feb = series.find((p) => p.monthKey === "2026-02");
    expect(dec?.totalLives).toBe(40);
    expect(feb?.totalLives).toBe(40);
    expect(mar?.totalLives).toBe(50);
    expect(mar?.monthlyPremium).toBeCloseTo(50 * 24.06, 2);
    expect(dashboardInsight(series)).toMatch(/premium/i);
  });
});

describe("csv", () => {
  it("escapes commas and quotes", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""\r\n');
  });

  it("builds ledger CSV with header", () => {
    const csv = ledgerRowsToCsv([
      {
        id: "e1",
        effectiveDate: "2026-03-15T00:00:00.000Z",
        kind: "ADD",
        organisationName: "Org",
        siteName: "Site",
        categoryLabel: "Essential",
        delta: 5,
        note: null,
      },
    ]);
    expect(csv.startsWith("id,effectiveDate,kind")).toBe(true);
    expect(csv).toContain("e1");
  });
});
