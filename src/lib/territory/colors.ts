import type { RiskCategoryCode } from "@/lib/territory/types";
import { toRiskCategoryLabel } from "@/lib/territory/types";

/** Hex colours for MapLibre paint expressions (CSS vars are not usable in GL). */
export const RISK_CATEGORY_HEX: Record<RiskCategoryCode, string> = {
  Low: "#3d9a5f",
  Medium: "#d4a017",
  High: "#e07a2f",
  VeryHigh: "#c0392b",
  Extreme: "#6b1e1e",
};

export const RISK_CATEGORY_TAILWIND: Record<RiskCategoryCode, string> = {
  Low: "bg-risk-low",
  Medium: "bg-risk-medium",
  High: "bg-risk-high",
  VeryHigh: "bg-risk-very-high",
  Extreme: "bg-risk-extreme",
};

export function riskCategoryMatchExpression(): unknown[] {
  return [
    "match",
    ["get", "riskCategory"],
    "Low",
    RISK_CATEGORY_HEX.Low,
    "Medium",
    RISK_CATEGORY_HEX.Medium,
    "High",
    RISK_CATEGORY_HEX.High,
    "VeryHigh",
    RISK_CATEGORY_HEX.VeryHigh,
    "Extreme",
    RISK_CATEGORY_HEX.Extreme,
    "#888888",
  ];
}

export { toRiskCategoryLabel };
