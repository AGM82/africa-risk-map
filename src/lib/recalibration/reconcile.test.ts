import { describe, expect, it } from "vitest";
import { reconcile } from "@/lib/recalibration/reconcile";

describe("reconcile", () => {
  it("reports shortfall when actual is below baseline", () => {
    const progress = reconcile([{ assignedPlanType: "ESSENTIAL", headcount: 40 }], {
      ESSENTIAL: 100,
      PREMIUM: 10,
    });
    expect(progress.balanced).toBe(false);
    expect(progress.byPlan[0]).toMatchObject({
      planType: "ESSENTIAL",
      actual: 40,
      baseline: 100,
      delta: -60,
      balanced: false,
    });
    expect(progress.byPlan[1]?.actual).toBe(0);
    expect(progress.progressRatio).toBeCloseTo(0.4 / 1.1, 5);
  });

  it("reports surplus when actual exceeds baseline", () => {
    const progress = reconcile(
      [
        { assignedPlanType: "ESSENTIAL", headcount: 110 },
        { assignedPlanType: "PREMIUM", headcount: 10 },
      ],
      { ESSENTIAL: 100, PREMIUM: 10 },
    );
    expect(progress.balanced).toBe(false);
    expect(progress.byPlan[0]?.delta).toBe(10);
    expect(progress.progressRatio).toBe(1);
  });

  it("is balanced when every plan matches exactly", () => {
    const progress = reconcile(
      [
        { assignedPlanType: "ESSENTIAL", headcount: 42 },
        { assignedPlanType: "PREMIUM", headcount: 10 },
        { assignedPlanType: "PREMIUM", headcount: 8 },
      ],
      { ESSENTIAL: 42, PREMIUM: 18 },
    );
    expect(progress.balanced).toBe(true);
    expect(progress.actualTotal).toBe(60);
    expect(progress.baselineTotal).toBe(60);
    expect(progress.progressRatio).toBe(1);
  });

  it("treats empty locations against zero baselines as balanced", () => {
    const progress = reconcile([], { ESSENTIAL: 0, PREMIUM: 0 });
    expect(progress.balanced).toBe(true);
    expect(progress.progressRatio).toBe(1);
  });

  it("treats empty locations against non-zero baselines as unbalanced", () => {
    const progress = reconcile([], { ESSENTIAL: 6503, PREMIUM: 14 });
    expect(progress.balanced).toBe(false);
    expect(progress.progressRatio).toBe(0);
  });
});
