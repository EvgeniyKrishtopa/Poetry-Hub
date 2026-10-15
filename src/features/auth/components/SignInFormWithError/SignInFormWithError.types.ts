export interface SignInFormWithErrorProps {
  /** The `/login` page's request-time `error` search param. */
  readonly error: Promise<string | string[] | undefined>;
}
