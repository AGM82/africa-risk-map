import { z } from "zod";
import { MEMBER_ORG_STATUSES, PLAN_TYPES } from "@/lib/org-location/types";

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
});

export const memberOrganisationUpdateSchema = z
  .object({
    name: nameField.optional(),
    status: statusField.optional(),
    defaultPlanType: planTypeField.optional(),
    riskMgmtPlanOnFile: z.boolean().optional(),
    crisisMgmtPlanOnFile: z.boolean().optional(),
    fullUnderwritingApproved: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.status !== undefined ||
      v.defaultPlanType !== undefined ||
      v.riskMgmtPlanOnFile !== undefined ||
      v.crisisMgmtPlanOnFile !== undefined ||
      v.fullUnderwritingApproved !== undefined,
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
