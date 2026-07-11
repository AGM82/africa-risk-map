import { z } from "zod";
import { PLAN_TYPES } from "@/lib/org-location/types";
import { CENSUS_INVITATION_PURPOSES } from "@/lib/census/types";

const idField = z.string().trim().min(1);
const nameField = z.string().trim().min(2).max(120);
const siteNameField = z.string().trim().min(2).max(120);
const headcountField = z.number().int().min(0).max(1_000_000);
const optionalContact = z.string().trim().max(120).nullable().optional();
const optionalEmail = z.string().trim().email().max(200).nullable().optional();
const optionalPhone = z.string().trim().max(40).nullable().optional();

export const censusInvitationCreateSchema = z.object({
  clientId: idField,
  memberOrganisationId: idField,
  purpose: z.enum(CENSUS_INVITATION_PURPOSES),
});

export const censusStubOrgCreateSchema = z.object({
  clientId: idField,
  name: nameField,
  contactName: optionalContact,
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  operationsNote: z.string().trim().max(500).nullable().optional(),
  defaultPlanType: z.enum(PLAN_TYPES).optional(),
});

export const censusLocationLineSchema = z
  .object({
    territoryId: idField,
    siteName: siteNameField,
    essentialHeadcount: headcountField,
    premiumHeadcount: headcountField,
  })
  .refine((v) => v.essentialHeadcount + v.premiumHeadcount > 0, {
    message: "Each location needs at least one Essential or Premium headcount",
  });

export const censusSubmitSchema = z
  .object({
    organisationName: nameField,
    contactName: optionalContact,
    contactEmail: optionalEmail,
    contactPhone: optionalPhone,
    asOfDate: z.coerce.date(),
    preferredPlanType: z.enum(PLAN_TYPES),
    riskMgmtPlanAvailable: z.boolean().optional(),
    crisisMgmtPlanAvailable: z.boolean().optional(),
    locationLines: z.array(censusLocationLineSchema).min(1),
  })
  .refine(
    (v) =>
      v.locationLines.reduce(
        (sum, line) => sum + line.essentialHeadcount + line.premiumHeadcount,
        0,
      ) >= 1,
    { message: "Declare at least one covered life across locations" },
  );

export const censusReviewNoteSchema = z.object({
  reviewNote: z.string().trim().max(500).nullable().optional(),
});
