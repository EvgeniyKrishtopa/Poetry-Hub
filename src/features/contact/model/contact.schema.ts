import { z } from "zod";

import { HONEYPOT_FIELD } from "./contact.constants";

/** The only validation of the contact fields (NFR-3); task 2.1 adds the trimming and limits of design D3. */
export const contactMessageSchema = z.object({
  name: z.string(),
  email: z.string(),
  message: z.string(),
  [HONEYPOT_FIELD]: z.string().optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
