import { z } from "zod";

// Shapes only: the uuid and cursor rules arrive with the actions (task 3.2), which validate on the server before any
// RPC (FR-12).

export const targetUserSchema = z.object({ userId: z.string() });

export const deleteTargetSchema = z.object({ id: z.string() });

export const listQuerySchema = z.object({
  after: z.string().optional(),
  email: z.string().optional(),
});

export type TargetUserInput = z.infer<typeof targetUserSchema>;
export type DeleteTargetInput = z.infer<typeof deleteTargetSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
