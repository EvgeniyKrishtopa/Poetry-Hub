import Link from "next/link";

import { RUSSIAN_LANG } from "@/shared/config/constants";

import { AUTHOR_EDITOR_PATH } from "../../model/author.constants";
import { OWNER_EDIT_LINK_LABEL } from "../../model/author-messages";

import type { AuthorOwnerLinkViewProps } from "./AuthorOwnerLinkView.types";

/** "Редактировать профиль" when the visitor owns the profile (FR-15). */
export function AuthorOwnerLinkView({ isOwner }: AuthorOwnerLinkViewProps) {
  if (!isOwner) return null;

  return (
    <Link lang={RUSSIAN_LANG} href={AUTHOR_EDITOR_PATH} className="self-start font-medium text-accent underline-offset-4 hover:underline">
      {OWNER_EDIT_LINK_LABEL}
    </Link>
  );
}
