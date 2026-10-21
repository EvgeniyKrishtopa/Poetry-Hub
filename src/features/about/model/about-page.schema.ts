import { z } from "zod";

// The `greeting` content type's fields; task 2.2 tightens each to a non-blank, trimmed string.
const aboutPageEntrySchema = z.object({
  key: z.string(),
  title: z.string(),
  message: z.string(),
});

export const aboutPageCollectionResponseSchema = z.object({
  greetingCollection: z.object({
    items: z.array(aboutPageEntrySchema),
  }),
});

export type AboutPageEntry = z.infer<typeof aboutPageEntrySchema>;
