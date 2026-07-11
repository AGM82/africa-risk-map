"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import type { MemberOrganisationStatus, PlanType } from "@/lib/org-location/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function createMemberOrganisationAction(input: {
  clientId: string;
  name: string;
  status?: MemberOrganisationStatus;
  defaultPlanType?: PlanType;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { orgLocation } = createFixtureAdminServices();
    await orgLocation.createMemberOrganisation(auth, input);
    revalidatePath("/organisations");
    revalidatePath("/recalibration");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateMemberOrganisationFlagsAction(input: {
  id: string;
  riskMgmtPlanOnFile?: boolean;
  crisisMgmtPlanOnFile?: boolean;
  fullUnderwritingApproved?: boolean;
  status?: MemberOrganisationStatus;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { orgLocation } = createFixtureAdminServices();
    await orgLocation.updateMemberOrganisation(auth, input.id, {
      ...(input.riskMgmtPlanOnFile !== undefined
        ? { riskMgmtPlanOnFile: input.riskMgmtPlanOnFile }
        : {}),
      ...(input.crisisMgmtPlanOnFile !== undefined
        ? { crisisMgmtPlanOnFile: input.crisisMgmtPlanOnFile }
        : {}),
      ...(input.fullUnderwritingApproved !== undefined
        ? { fullUnderwritingApproved: input.fullUnderwritingApproved }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
    revalidatePath("/organisations");
    revalidatePath("/recalibration");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function createLocationAction(input: {
  memberOrganisationId: string;
  territoryId: string;
  siteName: string;
  headcount: number;
  assignedPlanType: PlanType;
  coverCategoryId?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { orgLocation } = createFixtureAdminServices();
    await orgLocation.createLocation(auth, input);
    revalidatePath("/organisations");
    revalidatePath("/recalibration");
    revalidatePath("/calculator");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
