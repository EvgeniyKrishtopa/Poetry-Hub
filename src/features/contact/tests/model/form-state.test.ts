import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD } from "../../model/contact.constants";
import type { ContactActionResult, ContactFormState, ContactFormValues } from "../../model/contact.types";
import { readContactValues, toContactFormState } from "../../model/form-state";

const VALUES: ContactFormValues = {
  name: "  Анна ",
  email: "anna@example.com",
  message: "Привет!",
  [HONEYPOT_FIELD]: "",
};

describe("readContactValues", () => {
  // implements FR-4, FR-10 of add-contact-form
  it("reads every field as the raw string, the honeypot included", () => {
    const formData = new FormData();
    formData.set("name", VALUES.name);
    formData.set("email", VALUES.email);
    formData.set("message", VALUES.message);
    formData.set(HONEYPOT_FIELD, "http://spam.example");

    expect(readContactValues(formData)).toEqual({ ...VALUES, [HONEYPOT_FIELD]: "http://spam.example" });
  });

  it("reads a missing field, or a file, as empty", () => {
    const formData = new FormData();
    formData.set("name", new Blob(["x"]));

    expect(readContactValues(formData)).toEqual({ name: "", email: "", message: "", [HONEYPOT_FIELD]: "" });
  });
});

describe("toContactFormState", () => {
  // implements FR-5, FR-8, FR-9 of add-contact-form
  it.each<[string, ContactActionResult, ContactFormState]>([
    [
      "validationErrors, first message per field",
      {
        validationErrors: {
          formErrors: [],
          fieldErrors: { name: ["first", "second"], email: ["email error"] },
        },
      },
      { status: "invalid", values: VALUES, fieldErrors: { name: "first", email: "email error" } },
    ],
    ["serverError", { serverError: "generic" }, { status: "failed", values: VALUES }],
    ["no data", {}, { status: "failed", values: VALUES }],
    ["data sent", { data: { status: "sent" } }, { status: "sent" }],
    ["data failed", { data: { status: "failed" } }, { status: "failed", values: VALUES }],
  ])("maps %s", (_case, result, expected) => {
    expect(toContactFormState(result, VALUES)).toEqual(expected);
  });
});
