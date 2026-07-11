"use server";

import { createFixtureAdminServices } from "@/lib/admin/fixture-services";

export type PublicActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function submitCensusByTokenAction(input: {
  token: string;
  organisationName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  asOfDate: string;
  preferredPlanType: "ESSENTIAL" | "PREMIUM";
  riskMgmtPlanAvailable: boolean;
  crisisMgmtPlanAvailable: boolean;
  locationLines: readonly {
    territoryId: string;
    siteName: string;
    essentialHeadcount: number;
    premiumHeadcount: number;
  }[];
}): Promise<PublicActionResult<{ submissionId: string }>> {
  try {
    const { census } = createFixtureAdminServices();
    const result = await census.submitByToken(input.token, {
      organisationName: input.organisationName,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      asOfDate: input.asOfDate,
      preferredPlanType: input.preferredPlanType,
      riskMgmtPlanAvailable: input.riskMgmtPlanAvailable,
      crisisMgmtPlanAvailable: input.crisisMgmtPlanAvailable,
      locationLines: input.locationLines,
    });
    return { ok: true, data: { submissionId: result.submission.id } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
