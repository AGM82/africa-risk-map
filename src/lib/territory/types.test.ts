import { displayLabel, fromRiskCategoryLabel, toRiskCategoryLabel } from "@/lib/territory/types";
import { describe, expect, it } from "vitest";

describe("territory type helpers", () => {
  it("formats display labels", () => {
    expect(displayLabel("Kenya", "")).toBe("Kenya");
    expect(displayLabel("Nigeria", "North-East")).toBe("Nigeria — North-East");
  });

  it("round-trips Very High labels", () => {
    expect(fromRiskCategoryLabel("Very High")).toBe("VeryHigh");
    expect(toRiskCategoryLabel("VeryHigh")).toBe("Very High");
    expect(fromRiskCategoryLabel("Low")).toBe("Low");
    expect(fromRiskCategoryLabel("nope")).toBeUndefined();
  });
});
