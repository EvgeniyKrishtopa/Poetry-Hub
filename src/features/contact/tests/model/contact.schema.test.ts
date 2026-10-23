import { describe, expect, it } from "vitest";

import { EMAIL_MAX_LENGTH, HONEYPOT_FIELD, MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH } from "../../model/contact.constants";
import { CONTACT_FIELD_ERRORS } from "../../model/contact-messages";
import { contactMessageSchema } from "../../model/contact.schema";

const VALID = { name: "Анна", email: "anna@example.com", message: "Привет!" };
const EMAIL_DOMAIN = "@example.com";

function emailOfLength(length: number): string {
  return `${"a".repeat(length - EMAIL_DOMAIN.length)}${EMAIL_DOMAIN}`;
}

function fieldErrors(input: unknown) {
  const result = contactMessageSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

describe("contactMessageSchema", () => {
  // implements FR-5 of add-contact-form
  it("trims every value before checking it", () => {
    const result = contactMessageSchema.parse({
      name: "  Анна  ",
      email: "  anna@example.com ",
      message: "\n Привет! \t",
    });

    expect(result).toEqual({ name: "Анна", email: "anna@example.com", message: "Привет!" });
  });

  // implements FR-5 of add-contact-form
  it.each([
    ["name", NAME_MAX_LENGTH, "a".repeat(NAME_MAX_LENGTH), "a".repeat(NAME_MAX_LENGTH + 1), CONTACT_FIELD_ERRORS.nameTooLong],
    ["email", EMAIL_MAX_LENGTH, emailOfLength(EMAIL_MAX_LENGTH), emailOfLength(EMAIL_MAX_LENGTH + 1), CONTACT_FIELD_ERRORS.emailTooLong],
    ["message", MESSAGE_MAX_LENGTH, "a".repeat(MESSAGE_MAX_LENGTH), "a".repeat(MESSAGE_MAX_LENGTH + 1), CONTACT_FIELD_ERRORS.messageTooLong],
  ])("accepts a %s of %i characters and rejects one more", (field, _limit, atLimit, overLimit, message) => {
    expect(fieldErrors({ ...VALID, [field]: atLimit })).toEqual({});
    expect(fieldErrors({ ...VALID, [field]: overLimit })).toEqual({ [field]: message });
  });

  // implements FR-5 of add-contact-form
  it("counts the length after trimming", () => {
    expect(fieldErrors({ ...VALID, name: `  ${"a".repeat(NAME_MAX_LENGTH)}  ` })).toEqual({});
  });

  // implements FR-5 of add-contact-form
  it.each(["", "   "])("rejects the name and email %j and accepts the same message", (value) => {
    expect(fieldErrors({ name: value, email: value, message: value })).toEqual({
      name: CONTACT_FIELD_ERRORS.nameRequired,
      email: CONTACT_FIELD_ERRORS.emailInvalid,
    });
  });

  // implements FR-5 of add-contact-form
  it("rejects a malformed email with the invalid message", () => {
    expect(fieldErrors({ ...VALID, email: "not-an-email" })).toEqual({ email: CONTACT_FIELD_ERRORS.emailInvalid });
  });

  // implements FR-10 of add-contact-form
  it("never rejects on the honeypot field", () => {
    expect(contactMessageSchema.parse({ ...VALID, [HONEYPOT_FIELD]: "http://spam.example" })).toMatchObject({
      [HONEYPOT_FIELD]: "http://spam.example",
    });
    expect(fieldErrors(VALID)).toEqual({});
  });
});

describe("CONTACT_FIELD_ERRORS", () => {
  // implements FR-5, NFR-6 of add-contact-form
  it("holds the copy table's messages, with the limits taken from the constants", () => {
    expect(CONTACT_FIELD_ERRORS).toEqual({
      nameRequired: "Введите имя",
      nameTooLong: `Имя должно быть не длиннее ${NAME_MAX_LENGTH} символов`,
      emailInvalid: "Введите корректный адрес электронной почты",
      emailTooLong: `Адрес почты должен быть не длиннее ${EMAIL_MAX_LENGTH} символов`,
      messageTooLong: `Сообщение должно быть не длиннее ${MESSAGE_MAX_LENGTH} символов`,
    });
    expect(CONTACT_FIELD_ERRORS.nameTooLong).toBe("Имя должно быть не длиннее 80 символов");
    expect(CONTACT_FIELD_ERRORS.emailTooLong).toBe("Адрес почты должен быть не длиннее 254 символов");
    expect(CONTACT_FIELD_ERRORS.messageTooLong).toBe("Сообщение должно быть не длиннее 300 символов");
  });
});
