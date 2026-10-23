import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { CONTACT_COPY } from "../model/contact-messages";

/** The shared log-and-mask policy: an error's message or the input could carry the visitor's data. */
export const contactActionClient = createActionClient({
  logPrefix: "contact",
  genericMessage: CONTACT_COPY.sendFailed,
});
