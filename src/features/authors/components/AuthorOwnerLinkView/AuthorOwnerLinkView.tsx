import Link from "next/link";

import { POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";
import { CONTENT_LANG } from "@/shared/config/constants";

import { AUTHOR_EDITOR_PATH } from "../../model/author.constants";
import { OWNER_LINK_LABELS } from "../../model/author-messages";

import type { AuthorOwnerLinkViewProps } from "./AuthorOwnerLinkView.types";

const OWNER_LINK_CLASS = "font-medium text-accent underline-offset-4 hover:underline";

/** The edit-profile and poem management links, shown only when the visitor owns the profile (FR-15). */
export function AuthorOwnerLinkView({ isOwner }: AuthorOwnerLinkViewProps) {
  if (!isOwner) return null;

  return (
    <div lang={CONTENT_LANG} className="flex flex-wrap gap-x-4 gap-y-1">
      <Link href={AUTHOR_EDITOR_PATH} className={OWNER_LINK_CLASS}>
        {OWNER_LINK_LABELS.editProfile}
      </Link>
      <Link href={POEM_MANAGEMENT_PATH} className={OWNER_LINK_CLASS}>
        {OWNER_LINK_LABELS.managePoems}
      </Link>
    </div>
  );
}
