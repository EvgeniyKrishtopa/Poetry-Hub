import type { ContactMessageInput } from "./contact.schema";

/** The plain-text Telegram message for one submission (FR-6); the values are already trimmed. */
export function formatContactMessage(input: ContactMessageInput, siteName: string): string {
  const header = `Новое сообщение с сайта ${siteName}\nИмя: ${input.name}\nПочта: ${input.email}`;
  if (input.message === "") return header;
  return `${header}\n\n${input.message}`;
}
