import type { ContactActionResult, ContactFormState, ContactFormValues } from "./contact.types";

/** The submitted values as raw strings, a missing field read as empty. */
export function readContactValues(formData: FormData): ContactFormValues {
  void formData;
  throw new Error("not implemented");
}

/** Maps the action's result to the form's next state (design D5). */
export function toContactFormState(result: ContactActionResult, values: ContactFormValues): ContactFormState {
  void result;
  void values;
  throw new Error("not implemented");
}
