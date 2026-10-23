import { describe, expect, it } from "vitest";

import { contactMessageSchema } from "../../model/contact.schema";
import { formatContactMessage } from "../../model/format-contact-message";

const SITE_NAME = "Поэтический Хаб";

describe("formatContactMessage", () => {
  // implements FR-6 of add-contact-form
  it("writes the header lines, an empty line, and the message as given", () => {
    const input = contactMessageSchema.parse({
      name: "  Анна  ",
      email: "anna@example.com",
      message: "Привет!\n<b>стихи</b>",
    });

    expect(formatContactMessage(input, SITE_NAME)).toBe(
      "Новое сообщение с сайта Поэтический Хаб\nИмя: Анна\nПочта: anna@example.com\n\nПривет!\n<b>стихи</b>",
    );
  });

  // implements FR-6 of add-contact-form
  it("ends after the email line when the trimmed message is empty", () => {
    const input = contactMessageSchema.parse({ name: "Анна", email: "anna@example.com", message: "   " });

    expect(formatContactMessage(input, SITE_NAME)).toBe(
      "Новое сообщение с сайта Поэтический Хаб\nИмя: Анна\nПочта: anna@example.com",
    );
  });
});
