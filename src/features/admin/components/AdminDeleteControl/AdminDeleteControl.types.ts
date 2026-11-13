export interface AdminDeleteControlProps {
  readonly kind: "poem" | "collection";
  readonly id: string;
  readonly title: string;
  /** The target's author: the only value `may_moderate_author` needs to decide whether the control shows (design D8). */
  readonly authorId: string;
  /** Where the admin lands after a successful delete; the route file builds it. */
  readonly redirectHref: string;
}
