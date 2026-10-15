export interface SignInFormWithErrorProps {
  /** The `/login` page's request-time search params; only `error` is read. */
  readonly searchParams: Promise<{ error?: string | string[] }>;
}
