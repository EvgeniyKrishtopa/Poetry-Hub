export interface SignInFormProps {
  /** A form-level message shown until the first submission, e.g. the confirm-failed text. */
  readonly initialError?: string;
  /** `/login` was opened with `error=recovery-failed`: the recovery offer shows until the first sign-in submit. */
  readonly offerOnLoad?: boolean;
}
