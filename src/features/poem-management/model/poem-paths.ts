import { POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";

/** The add form, `/account/poems/new`. */
export const NEW_POEM_PATH = `${POEM_MANAGEMENT_PATH}/new`;

/** The owner's page of one poem, `/account/poems/<poemId>`. */
export function ownPoemPath(poemId: string): string {
  return `${POEM_MANAGEMENT_PATH}/${poemId}`;
}
