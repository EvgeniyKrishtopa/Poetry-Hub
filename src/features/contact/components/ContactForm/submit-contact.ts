import { z } from "zod";

import { sendContactMessageAction } from "../../actions/contact.actions";
import { CONTACT_STATUS } from "../../model/contact.constants";
import { contactMessageSchema } from "../../model/contact.schema";
import type { ContactFormState } from "../../model/contact.types";
import { readContactValues, toContactFormState } from "../../model/form-state";

/** Checks the values in the browser, then calls the action; a rejected call becomes `failed` (design D5). */
export async function submitContact(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values = readContactValues(formData);

  const parsed = contactMessageSchema.safeParse(values);
  if (!parsed.success) {
    // The browser's errors have the action's flattened shape, so one mapping serves both.
    return toContactFormState({ validationErrors: z.flattenError(parsed.error) }, values);
  }

  try {
    return toContactFormState(await sendContactMessageAction(values), values);
  } catch (error) {
    // Without this, useActionState rethrows during render and the global error screen loses the
    // typed text. The error's type only: its message could echo what was submitted (NFR-2). The
    // online flag tells a visitor's dropped connection from a refusal on the way to the server.
    const errorType = error instanceof Error ? error.name : typeof error;
    console.error(`[contact] action call rejected: ${errorType} (online: ${navigator.onLine})`);
    return { status: CONTACT_STATUS.failed, values };
  }
}
