import { getCurrentUserId } from "@/features/auth";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { AuthorOwnerLinkView } from "../AuthorOwnerLinkView/AuthorOwnerLinkView";

import type { AuthorOwnerLinkProps } from "./AuthorOwnerLink.types";

/** Per-request owner check in its own Suspense boundary; renders nothing for other visitors (FR-15). */
export async function AuthorOwnerLink({ profileId }: AuthorOwnerLinkProps) {
  const userId = await getCurrentUserId();
  // Signed out: no owner read at all.
  if (userId === null) return <AuthorOwnerLinkView isOwner={false} />;

  // A failed read shows no link rather than an error: the page itself is fine (FR-18).
  const own = await getMyAuthorProfile();
  const isOwner = own.ok && own.profile?.id === profileId;
  return <AuthorOwnerLinkView isOwner={isOwner} />;
}
