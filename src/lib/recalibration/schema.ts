import { z } from "zod";

const nonNegInt = z.number().int().min(0).max(10_000_000);

export const planTypeBaselinesSchema = z.object({
  ESSENTIAL: nonNegInt,
  PREMIUM: nonNegInt,
});

export const recalibrationBatchCreateSchema = z.object({
  clientId: z.string().trim().min(1),
  baselines: planTypeBaselinesSchema,
});
