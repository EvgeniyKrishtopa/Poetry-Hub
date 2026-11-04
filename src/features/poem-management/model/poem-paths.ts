import { POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";

import { EDIT_SEGMENT } from "./poem-management.constants";

/** The add form, `/account/poems/new`. */
export const NEW_POEM_PATH = `${POEM_MANAGEMENT_PATH}/new`;

/** The owner's page of one poem, `/account/poems/<poemId>`. */
export function ownPoemPath(poemId: string): string {
  return `${POEM_MANAGEMENT_PATH}/${poemId}`;
}

/** The owner's edit page of one poem, `/account/poems/<poemId>/edit` (edit-poem design D6). */
export function editPoemPath(poemId: string): string {
  return `${ownPoemPath(poemId)}/${EDIT_SEGMENT}`;
}
