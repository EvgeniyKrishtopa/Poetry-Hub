import type { ReactNode } from "react";

import type { PublicAuthor } from "../../model/author.types";

export interface AuthorProfileViewProps {
  readonly author: PublicAuthor;
  /** The per-request owner link, rendered before the heading; the cached body stays the same for every visitor. */
  readonly ownerLink: ReactNode;
  /** A route-supplied control for a reader allowed to moderate, rendered under the heading; absent for none. */
  readonly moderation?: ReactNode;
  /** The poems entry, rendered last: after the about section, or after the photo when about is empty. */
  readonly poems: ReactNode;
}
