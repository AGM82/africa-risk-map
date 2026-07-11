import { z } from "zod";

const ROLES = ["INSURER_ADMIN", "BROKER", "CLIENT"] as const;

export const inviteUserSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(ROLES),
  clientId: z.string().trim().min(1).nullable().optional(),
  brokerOrganisationId: z.string().trim().min(1).nullable().optional(),
});

export type InviteUserSchema = z.infer<typeof inviteUserSchema>;
