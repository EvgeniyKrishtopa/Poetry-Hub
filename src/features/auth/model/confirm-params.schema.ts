import { z } from "zod";

/** Only a recovery link (`type=recovery`) with a hash is verified by `confirmRecovery` (password-recovery design D1). */
export const recoveryParamsSchema = z.object({
  token_hash: z.string().min(1),
  type: z.literal("recovery"),
});

// Only a sign-up confirmation (`type=email`) with a hash is verified
export const confirmParamsSchema = z.object({
  token_hash: z.string().min(1),
  type: z.literal("email"),
});
