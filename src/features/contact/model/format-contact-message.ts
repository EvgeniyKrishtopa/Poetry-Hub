import type { ContactMessageInput } from "./contact.schema";

/** The plain-text Telegram message for one submission (FR-6); the values are already trimmed. */
export function formatContactMessage(input: ContactMessageInput, siteName: string): string {
  void input;
  void siteName;
  throw new Error("not implemented");
}
