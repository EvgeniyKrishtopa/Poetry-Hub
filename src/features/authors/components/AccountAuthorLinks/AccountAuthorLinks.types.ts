import type { MyProfileResult } from "../../model/author.types";

export interface AccountAuthorLinksProps {
  /** The owner read: the three FR-1 states, or the FR-18 load-failure alert. */
  readonly result: MyProfileResult;
}
