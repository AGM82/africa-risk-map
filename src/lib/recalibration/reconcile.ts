import type { PlanType } from "@/lib/org-location/types";
import type {
  PlanTypeBaselines,
  PlanProgress,
  ReconciliationProgress,
} from "@/lib/recalibration/types";

type LocationHeadcount = Readonly<{
  assignedPlanType: PlanType;
  headcount: number;
}>;

/**
 * Sums location headcounts by PlanType and compares to ledger baselines.
 * Balanced only when every plan's actual equals its baseline exactly.
 */
export function reconcile(
  locations: readonly LocationHeadcount[],
  baselines: PlanTypeBaselines,
): ReconciliationProgress {
  let essentialActual = 0;
  let premiumActual = 0;
  for (const loc of locations) {
    if (loc.assignedPlanType === "ESSENTIAL") {
      essentialActual += loc.headcount;
    } else {
      premiumActual += loc.headcount;
    }
  }

  const byPlan: PlanProgress[] = [
    {
      planType: "ESSENTIAL",
      actual: essentialActual,
      baseline: baselines.ESSENTIAL,
      delta: essentialActual - baselines.ESSENTIAL,
      balanced: essentialActual === baselines.ESSENTIAL,
    },
    {
      planType: "PREMIUM",
      actual: premiumActual,
      baseline: baselines.PREMIUM,
      delta: premiumActual - baselines.PREMIUM,
      balanced: premiumActual === baselines.PREMIUM,
    },
  ];

  const actualTotal = essentialActual + premiumActual;
  const baselineTotal = baselines.ESSENTIAL + baselines.PREMIUM;
  const progressRatio =
    baselineTotal === 0 ? (actualTotal === 0 ? 1 : 0) : Math.min(1, actualTotal / baselineTotal);

  return {
    byPlan,
    actualTotal,
    baselineTotal,
    progressRatio,
    balanced: byPlan.every((p) => p.balanced),
  };
}
