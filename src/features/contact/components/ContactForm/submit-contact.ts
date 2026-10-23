import type { ContactFormState } from "../../model/contact.types";

/** Checks the values in the browser, then calls the action; a rejected call becomes `failed` (design D5). */
export async function submitContact(previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  void previous;
  void formData;
  throw new Error("not implemented");
}
