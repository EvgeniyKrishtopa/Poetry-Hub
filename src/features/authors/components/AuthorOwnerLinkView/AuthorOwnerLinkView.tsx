import Link from "next/link";

import { OWNER_EDIT_LINK_LABEL } from "../../model/author-messages";

import type { AuthorOwnerLinkViewProps } from "./AuthorOwnerLinkView.types";

const EDITOR_PATH = "/account/author";

/** "Редактировать профиль" when the visitor owns the profile (FR-15). */
export function AuthorOwnerLinkView({ isOwner }: AuthorOwnerLinkViewProps) {
  if (!isOwner) return null;

  return (
    <Link lang="ru" href={EDITOR_PATH} className="self-start font-medium text-accent underline-offset-4 hover:underline">
      {OWNER_EDIT_LINK_LABEL}
    </Link>
  );
}
