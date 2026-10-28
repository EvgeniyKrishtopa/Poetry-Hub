import { z } from "zod";

/** One `public.poems` row as the public read selects it (design D3); task 3.1 tightens the field rules. */
export const poemRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  genre_id: z.string().nullable(),
  illustration_path: z.string().nullable(),
  created_at: z.string(),
});

export type PoemRow = z.infer<typeof poemRowSchema>;
