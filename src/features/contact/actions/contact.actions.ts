"use server";

import { siteConfig } from "@/shared/config/site";
import { sendTelegramMessage } from "@/shared/lib/telegram";

import { CONTACT_STATUS, HONEYPOT_FIELD } from "../model/contact.constants";
import { contactMessageSchema } from "../model/contact.schema";
import type { ContactSendResult } from "../model/contact.types";
import { formatContactMessage } from "../model/format-contact-message";

import { contactActionClient } from "./action-client";

/** Open to everyone: it reads no session. */
export const sendContactMessageAction = contactActionClient
  .inputSchema(contactMessageSchema)
  .action(async ({ parsedInput }): Promise<ContactSendResult> => {
    // A bot filled the hidden field: answer as on success so it learns nothing, and send nothing.
    if (parsedInput[HONEYPOT_FIELD]) return { status: CONTACT_STATUS.sent };

    const result = await sendTelegramMessage(formatContactMessage(parsedInput, siteConfig.name));
    if (!result.ok) {
      // Only the reason and status: the submitted values are visitor data (NFR-2).
      const details =
        result.status === undefined ? { reason: result.reason } : { reason: result.reason, status: result.status };
      console.error("[contact] send failed", details);
      return { status: CONTACT_STATUS.failed };
    }
    return { status: CONTACT_STATUS.sent };
  });
