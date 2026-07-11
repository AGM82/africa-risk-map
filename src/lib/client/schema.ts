import { z } from "zod";
import { CLIENT_STATUSES } from "@/lib/client/types";

/** URL-safe slug: lowercase letters, digits, hyphens (e.g. "graa"). */
const codeField = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Code must be lowercase letters, digits, or hyphens");

const nameField = z.string().trim().min(2).max(120);

const statusField = z.enum(CLIENT_STATUSES);

export const clientCreateSchema = z.object({
  name: nameField,
  code: codeField,
  status: statusField.optional(),
});

export const clientUpdateSchema = z
  .object({
    name: nameField.optional(),
    status: statusField.optional(),
  })
  .refine((v) => v.name !== undefined || v.status !== undefined, {
    message: "Provide at least one field to update",
  });

export const brokerOrganisationCreateSchema = z.object({
  name: nameField,
  code: codeField,
});
