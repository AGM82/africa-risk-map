"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import type { BookTotals, RiskMixDriftResult, WhatIfPreview } from "@/lib/premium/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export type SimulateWhatIfResult = Readonly<{
  preview: WhatIfPreview;
  riskMix: RiskMixDriftResult | null;
}>;

export async function simulateWhatIfAction(input: {
  clientId: string;
  territoryId: string;
  coverCategoryId: string;
  headcount: number;
  memberOrganisationId?: string;
  newOrganisationName?: string;
  siteName: string;
  riskMgmtPlanOnFile?: boolean;
  crisisMgmtPlanOnFile?: boolean;
  fullUnderwritingApproved?: boolean;
}): Promise<ActionResult<SimulateWhatIfResult>> {
  try {
    const auth = await requireAuthContext();
    const { premium } = createFixtureAdminServices();
    const result = await premium.simulateWhatIf(auth, input);
    return {
      ok: true,
      data: { preview: result.preview, riskMix: result.riskMix },
    };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function confirmWhatIfAction(input: {
  clientId: string;
  territoryId: string;
  coverCategoryId: string;
  headcount: number;
  memberOrganisationId?: string;
  newOrganisationName?: string;
  siteName: string;
  riskMgmtPlanOnFile?: boolean;
  crisisMgmtPlanOnFile?: boolean;
  fullUnderwritingApproved?: boolean;
}): Promise<ActionResult<{ book: BookTotals }>> {
  try {
    const auth = await requireAuthContext();
    const { premium } = createFixtureAdminServices();
    const result = await premium.confirmWhatIf(auth, input);
    revalidatePath("/calculator");
    revalidatePath("/organisations");
    revalidatePath("/recalibration");
    return { ok: true, data: { book: result.book } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
