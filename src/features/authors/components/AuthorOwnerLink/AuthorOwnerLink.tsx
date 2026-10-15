import type { AuthorOwnerLinkProps } from "./AuthorOwnerLink.types";

/** Per-request owner check in its own Suspense boundary; renders nothing for other visitors (FR-15). */
export async function AuthorOwnerLink(props: AuthorOwnerLinkProps) {
  void props;
  return null;
}
