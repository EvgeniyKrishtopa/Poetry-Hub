export interface ResetPasswordPageProps {
  /** The page's request-time `status` search param. */
  readonly status: Promise<string | string[] | undefined>;
}
