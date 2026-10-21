import { z } from "zod";

// Every field non-empty after trimming; the trimmed values are what reach the page.
const nonBlankString = z.string().trim().min(1);

// The `greeting` content type's fields, as every content page reads them.
const contentPageEntrySchema = z.object({
  key: nonBlankString,
  title: nonBlankString,
  message: nonBlankString,
});

export const contentPageCollectionResponseSchema = z.object({
  greetingCollection: z.object({
    items: z.array(contentPageEntrySchema),
  }),
});

export type ContentPageEntry = z.infer<typeof contentPageEntrySchema>;
