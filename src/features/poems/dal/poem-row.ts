import "server-only";

import { z } from "zod";

import type { Poem } from "../model/poem.types";

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

/** A checked row → `Poem`: the illustration's public-bucket URL and `created_at`'s UTC date. */
export function toPoem(row: PoemRow): Poem {
  void row;
  throw new Error("not implemented");
}
