import { z } from "zod";

/** The one set of field rules for the form and the action (FR-4); task 4.1 adds the trimming and limits of design D6, D7. */
export const poemFormSchema = z.object({
  title: z.string(),
  text: z.string(),
  genreId: z.string(),
});

export type PoemFormInput = z.infer<typeof poemFormSchema>;
