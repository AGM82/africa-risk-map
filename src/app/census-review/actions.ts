"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import type { CensusInvitationPurpose } from "@/lib/census/types";
import type { PlanType } from "@/lib/org-location/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function createCensusStubOrgAction(input: {
  clientId: string;
  name: string;
  contactEmail?: string;
  contactName?: string;
}): Promise<ActionResult<{ organisationId: string }>> {
  try {
    const auth = await requireAuthContext();
    const { census } = createFixtureAdminServices();
    const org = await census.createStubOrganisation(auth, input);
    revalidatePath("/organisations");
    revalidatePath("/census-review");
    return { ok: true, data: { organisationId: org.id } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function createCensusInvitationAction(input: {
  clientId: string;
  memberOrganisationId: string;
  purpose: CensusInvitationPurpose;
}): Promise<ActionResult<{ path: string; rawToken: string }>> {
  try {
    const auth = await requireAuthContext();
    const { census } = createFixtureAdminServices();
    const result = await census.createInvitation(auth, input);
    revalidatePath("/organisations");
    revalidatePath("/census-review");
    return { ok: true, data: { path: result.path, rawToken: result.rawToken } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function acceptCensusSubmissionAction(input: {
  submissionId: string;
  reviewNote?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { census } = createFixtureAdminServices();
    await census.acceptSubmission(auth, input.submissionId, {
      reviewNote: input.reviewNote ?? null,
    });
    revalidatePath("/census-review");
    revalidatePath("/organisations");
    revalidatePath("/dashboard");
    revalidatePath("/ledger");
    revalidatePath("/calculator");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function declineCensusSubmissionAction(input: {
  submissionId: string;
  reviewNote?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { census } = createFixtureAdminServices();
    await census.declineSubmission(auth, input.submissionId, {
      reviewNote: input.reviewNote ?? null,
    });
    revalidatePath("/census-review");
    revalidatePath("/organisations");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function requestCensusChangesAction(input: {
  submissionId: string;
  reviewNote?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { census } = createFixtureAdminServices();
    await census.requestChanges(auth, input.submissionId, {
      reviewNote: input.reviewNote ?? null,
    });
    revalidatePath("/census-review");
    revalidatePath("/organisations");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export type StubOrgPlanType = PlanType;
