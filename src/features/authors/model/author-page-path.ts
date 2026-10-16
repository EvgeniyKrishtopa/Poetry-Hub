import { AUTHORS_PATH } from "./author.constants";

/** A public author page, `/authors/<profile id>`: linked from the directory and the account page. */
export function authorPagePath(profileId: string): string {
  return `${AUTHORS_PATH}/${profileId}`;
}
