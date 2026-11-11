import { z } from "zod";

import { lowercaseUuidSchema } from "@/features/poems";

/**
 * One `public.collections` row as the public read selects it (public-collections D5). The id keeps the database's
 * lowercase spelling, because URLs match it exactly; `description` is never `''` (collection-management D2).
 */
export const publicCollectionRowSchema = z.object({
  id: lowercaseUuidSchema,
  title: z.string().min(1),
  description: z.string().min(1).nullable(),
  // PostgREST sends `timestamptz` with an offset, e.g. `2026-10-01T23:30:00+00:00`.
  created_at: z.iso.datetime({ offset: true }),
});

export type PublicCollectionRow = z.infer<typeof publicCollectionRowSchema>;
