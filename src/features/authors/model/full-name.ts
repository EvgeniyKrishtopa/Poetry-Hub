import type { PublicAuthor } from "./author.types";

/** "<first name> <last name>": the directory link, the page heading, and the photo's alt text. */
export function fullName({ firstName, lastName }: Pick<PublicAuthor, "firstName" | "lastName">): string {
  return `${firstName} ${lastName}`;
}
