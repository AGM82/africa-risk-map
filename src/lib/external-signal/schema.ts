import { z } from "zod";

export const reviewSignalSchema = z.object({
  signalId: z.string().min(1),
  note: z.string().max(2000).optional().nullable(),
});

export type ReviewSignalInput = z.infer<typeof reviewSignalSchema>;
