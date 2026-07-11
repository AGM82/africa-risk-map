import { describe, expect, it } from "vitest";
import { categoriseTotalScore, computeTotalScore, resolveScores } from "@/lib/territory/score";

const base = {
  healthcareInfrastructure: 2,
  medicalPersonnel: 2,
  medicalTransport: 2,
  emergencyResponse: 2,
  securityConflict: 2,
  occupationalHazards: 2,
};

describe("territory score helpers", () => {
  it("sums six sub-scores", () => {
    expect(computeTotalScore(base)).toBe(12);
  });

  it("categorises totals into risk bands", () => {
    expect(categoriseTotalScore(11)).toBe("Low");
    expect(categoriseTotalScore(15)).toBe("Medium");
    expect(categoriseTotalScore(22)).toBe("High");
    expect(categoriseTotalScore(28)).toBe("VeryHigh");
    expect(categoriseTotalScore(35)).toBe("Extreme");
  });

  it("honours workbook overrides for total and category", () => {
    expect(resolveScores(base, { totalScore: 28, riskCategory: "VeryHigh" })).toEqual({
      totalScore: 28,
      riskCategory: "VeryHigh",
    });
  });

  it("rejects out-of-range sub-scores", () => {
    expect(() => computeTotalScore({ ...base, securityConflict: 99 })).toThrow();
  });
});
