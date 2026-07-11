import { z } from "zod";

export const whatIfSimulateSchema = z.object({
  clientId: z.string().trim().min(1),
  territoryId: z.string().trim().min(1),
  coverCategoryId: z.string().trim().min(1),
  headcount: z.number().int().min(1).max(1_000_000),
  /** Optional incremental annual wage roll for Stated Benefits what-if (POPIA-safe aggregate). */
  additionalAnnualWageRoll: z.number().min(0).max(1_000_000_000_000).optional(),
  memberOrganisationId: z.string().trim().min(1).optional(),
  newOrganisationName: z.string().trim().min(2).max(120).optional(),
  siteName: z.string().trim().min(2).max(120),
  riskMgmtPlanOnFile: z.boolean().optional(),
  crisisMgmtPlanOnFile: z.boolean().optional(),
  fullUnderwritingApproved: z.boolean().optional(),
});

export const whatIfConfirmSchema = whatIfSimulateSchema.refine(
  (v) =>
    (v.memberOrganisationId !== undefined && v.memberOrganisationId.length > 0) ||
    (v.newOrganisationName !== undefined && v.newOrganisationName.length > 0),
  { message: "Provide memberOrganisationId or newOrganisationName" },
);

export type WhatIfInput = z.infer<typeof whatIfSimulateSchema>;
export type WhatIfConfirmInput = z.infer<typeof whatIfConfirmSchema>;
