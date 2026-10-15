import { z } from "zod";

// Only a sign-up confirmation (`type=email`) with a hash is verified
export const confirmParamsSchema = z.object({
  token_hash: z.string().min(1),
  type: z.literal("email"),
});
