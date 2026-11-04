import { ButtonLink } from "@/shared/ui";

import { EDIT_POEM_COPY } from "../../model/poem-management-messages";
import { editPoemPath } from "../../model/poem-paths";

import type { EditPoemButtonProps } from "./EditPoemButton.types";

/** The edit button: a link to the edit page, since it only navigates (edit-poem design D6). */
export function EditPoemButton({ poemId }: EditPoemButtonProps) {
  return <ButtonLink href={editPoemPath(poemId)}>{EDIT_POEM_COPY.open}</ButtonLink>;
}
