import type { PublicAuthor } from "./author.types";

/** Directory order: lower-cased last name, then first name, by code point, then id (FR-13). */
export function compareAuthors(a: PublicAuthor, b: PublicAuthor): number {
  void a;
  void b;
  throw new Error("not implemented");
}
