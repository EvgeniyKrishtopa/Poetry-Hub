"use server";

import { contactMessageSchema } from "../model/contact.schema";
import type { ContactSendResult } from "../model/contact.types";

import { contactActionClient } from "./action-client";

export const sendContactMessageAction = contactActionClient
  .inputSchema(contactMessageSchema)
  .action(async ({ parsedInput }): Promise<ContactSendResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });
