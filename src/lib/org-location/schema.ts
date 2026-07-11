import { z } from "zod";
import { ENDORSEMENT_KINDS, MEMBER_ORG_STATUSES, PLAN_TYPES } from "@/lib/org-location/types";

const nameField = z.string().trim().min(2).max(120);
const siteNameField = z.string().trim().min(2).max(120);
const clientIdField = z.string().trim().min(1);
const idField = z.string().trim().min(1);
const statusField = z.enum(MEMBER_ORG_STATUSES);
const planTypeField = z.enum(PLAN_TYPES);
const headcountField = z.number().int().min(0).max(1_000_000);

export const memberOrganisationCreateSchema = z.object({
  clientId: clientIdField,
  name: nameField,
  status: statusField.optional(),
  defaultPlanType: planTypeField.optional(),
  riskMgmtPlanOnFile: z.boolean().optional(),
  crisisMgmtPlanOnFile: z.boolean().optional(),
  fullUnderwritingApproved: z.boolean().optional(),
  contactName: z.string().trim().max(120).nullable().optional(),
  contactEmail: z.string().trim().email().max(200).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  operationsNote: z.string().trim().max(500).nullable().optional(),
});

export const memberOrganisationUpdateSchema = z
  .object({
    name: nameField.optional(),
    status: statusField.optional(),
    defaultPlanType: planTypeField.optional(),
    riskMgmtPlanOnFile: z.boolean().optional(),
    crisisMgmtPlanOnFile: z.boolean().optional(),
    fullUnderwritingApproved: z.boolean().optional(),
    contactName: z.string().trim().max(120).nullable().optional(),
    contactEmail: z.string().trim().email().max(200).nullable().optional(),
    contactPhone: z.string().trim().max(40).nullable().optional(),
    operationsNote: z.string().trim().max(500).nullable().optional(),
    lastCensusAcceptedAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.status !== undefined ||
      v.defaultPlanType !== undefined ||
      v.riskMgmtPlanOnFile !== undefined ||
      v.crisisMgmtPlanOnFile !== undefined ||
      v.fullUnderwritingApproved !== undefined ||
      v.contactName !== undefined ||
      v.contactEmail !== undefined ||
      v.contactPhone !== undefined ||
      v.operationsNote !== undefined ||
      v.lastCensusAcceptedAt !== undefined,
    { message: "Provide at least one field to update" },
  );

export const organisationLocationCreateSchema = z.object({
  memberOrganisationId: idField,
  territoryId: idField,
  siteName: siteNameField,
  headcount: headcountField,
  assignedPlanType: planTypeField,
  coverCategoryId: z.string().trim().min(1).nullable().optional(),
});

export const organisationLocationUpdateSchema = z
  .object({
    siteName: siteNameField.optional(),
    headcount: headcountField.optional(),
    assignedPlanType: planTypeField.optional(),
    coverCategoryId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (v) =>
      v.siteName !== undefined ||
      v.headcount !== undefined ||
      v.assignedPlanType !== undefined ||
      v.coverCategoryId !== undefined,
    { message: "Provide at least one field to update" },
  );

export const endorsementCreateSchema = z
  .object({
    clientId: clientIdField,
    organisationLocationId: idField,
    coverCategoryId: idField,
    policyId: idField,
    delta: z
      .number()
      .int()
      .refine((n) => n !== 0, { message: "delta must be non-zero" }),
    effectiveDate: z.coerce.date(),
    note: z.string().trim().max(500).nullable().optional(),
    kind: z.enum(ENDORSEMENT_KINDS),
    createdByUserId: idField,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "REMOVE" && v.delta >= 0) {
      ctx.addIssue({
        code: "custom",
        message: "REMOVE endorsements require a negative delta",
        path: ["delta"],
      });
    }
    if ((v.kind === "ADD" || v.kind === "BASELINE") && v.delta <= 0) {
      ctx.addIssue({
        code: "custom",
        message: `${v.kind} endorsements require a positive delta`,
        path: ["delta"],
      });
    }
  });
