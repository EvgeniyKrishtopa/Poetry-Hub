import { z } from "zod";

/**
 * A UUID in the canonical lowercase spelling the database returns. Poem URLs match ids exactly, so
 * an uppercase spelling is an unknown poem (author-poems FR-5), and junk never becomes a cache key or
 * reaches the database (design D3).
 */
export const lowercaseUuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

/** One `public.poems` row as the public read selects it (design D3). */
export const poemRowSchema = z.object({
  id: lowercaseUuidSchema,
  title: z.string().min(1),
  text: z.string().min(1),
  genre_id: z.string().min(1).nullable(),
  illustration_path: z.string().min(1).nullable(),
  // PostgREST sends `timestamptz` with an offset, e.g. `2026-10-01T23:30:00+00:00`.
  created_at: z.iso.datetime({ offset: true }),
});

export type PoemRow = z.infer<typeof poemRowSchema>;
