import { z } from "zod";

// implements FR-4 of add-contentful-home-greeting: every field non-empty after trimming; trimmed values reach the page
const nonBlankString = z.string().trim().min(1);

export const greetingSchema = z.object({
  key: nonBlankString,
  title: nonBlankString,
  message: nonBlankString,
});

export const greetingCollectionResponseSchema = z.object({
  greetingCollection: z.object({
    items: z.array(greetingSchema),
  }),
});

export type Greeting = z.infer<typeof greetingSchema>;
