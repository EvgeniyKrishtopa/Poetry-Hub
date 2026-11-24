export interface AuthNoticeProps {
  /** The home page's request-time `auth-notice` search param. */
  readonly notice: Promise<string | string[] | undefined>;
}
