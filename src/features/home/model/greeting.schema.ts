import { z } from "zod";

// Structure only; the trim().min(1) validation rules land in task 4.1.
export const greetingSchema = z.object({
  key: z.string(),
  title: z.string(),
  message: z.string(),
});

export const greetingCollectionResponseSchema = z.object({
  greetingCollection: z.object({
    items: z.array(greetingSchema),
  }),
});

export type Greeting = z.infer<typeof greetingSchema>;
