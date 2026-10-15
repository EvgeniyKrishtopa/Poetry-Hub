import { z } from "zod";

// Every field non-empty after trimming; the trimmed values are what reach the page.
const nonBlankString = z.string().trim().min(1);

const greetingSchema = z.object({
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
