import { z } from "zod";

// Every field non-empty after trimming; the trimmed values are what reach the page.
const nonBlankString = z.string().trim().min(1);

// The `greeting` content type's fields, as the about page reads them.
const aboutPageEntrySchema = z.object({
  key: nonBlankString,
  title: nonBlankString,
  message: nonBlankString,
});

export const aboutPageCollectionResponseSchema = z.object({
  greetingCollection: z.object({
    items: z.array(aboutPageEntrySchema),
  }),
});

export type AboutPageEntry = z.infer<typeof aboutPageEntrySchema>;
