import { z } from "zod";

// implements FR-5 of add-supabase-auth: only a sign-up confirmation (`type=email`) with a hash is verified
export const confirmParamsSchema = z.object({
  token_hash: z.string().min(1),
  type: z.literal("email"),
});
