import { describe, expect, it } from "vitest";
import { ANONYMISED_MARKER, anonymise } from "@/lib/anonymize";

type InsuredPersonLike = {
  id: string;
  fullName: string | null;
  nationalId: string | null;
  age: number | null;
  coverCategory: string;
  headcountContribution: number;
};

const base: InsuredPersonLike = {
  id: "loc-1",
  fullName: "Jane Ranger",
  nationalId: "8001015009087",
  age: 44,
  coverCategory: "Category 1 — Essential",
  headcountContribution: 1,
};

describe("anonymise", () => {
  it("redacts string identifiers with the marker and nulls non-string ones", () => {
    const result = anonymise(base, ["fullName", "nationalId", "age"]);
    expect(result.fullName).toBe(ANONYMISED_MARKER);
    expect(result.nationalId).toBe(ANONYMISED_MARKER);
    expect(result.age).toBeNull();
  });

  it("preserves the underwriting skeleton (unlisted keys) untouched", () => {
    const result = anonymise(base, ["fullName", "nationalId"]);
    expect(result.id).toBe("loc-1");
    expect(result.coverCategory).toBe("Category 1 — Essential");
    expect(result.headcountContribution).toBe(1);
  });

  it("leaves already-null values as null", () => {
    const result = anonymise({ ...base, fullName: null }, ["fullName"]);
    expect(result.fullName).toBeNull();
  });

  it("does not mutate the input record", () => {
    const snapshot = { ...base };
    anonymise(base, ["fullName", "nationalId"]);
    expect(base).toEqual(snapshot);
  });

  it("is a no-op when no identifying keys are given", () => {
    expect(anonymise(base, [])).toEqual(base);
  });
});
