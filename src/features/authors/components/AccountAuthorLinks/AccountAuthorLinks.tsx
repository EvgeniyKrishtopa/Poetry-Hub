import { Alert, ButtonLink } from "@/shared/ui";

import { AUTHOR_EDITOR_PATH } from "../../model/author.constants";
import { ACCOUNT_LINK_LABELS, PROFILE_LOAD_FAILED_MESSAGE } from "../../model/author-messages";
import { isPublicProfile } from "../../model/is-public-profile";

import type { AccountAuthorLinksProps } from "./AccountAuthorLinks.types";

/** The account page's author links in their three states (FR-1), or the load-failure alert (FR-18). */
export function AccountAuthorLinks({ result }: AccountAuthorLinksProps) {
  if (!result.ok) return <Alert tone="danger">{PROFILE_LOAD_FAILED_MESSAGE}</Alert>;

  const { profile } = result;
  if (profile === null) return <ButtonLink href={AUTHOR_EDITOR_PATH}>{ACCOUNT_LINK_LABELS.createProfile}</ButtonLink>;

  return (
    <div className="flex flex-wrap gap-2">
      <ButtonLink href={AUTHOR_EDITOR_PATH}>{ACCOUNT_LINK_LABELS.editProfile}</ButtonLink>
      {isPublicProfile(profile) && (
        <ButtonLink variant="ghost" href={`/authors/${profile.id}`}>
          {ACCOUNT_LINK_LABELS.openPublicPage}
        </ButtonLink>
      )}
    </div>
  );
}
