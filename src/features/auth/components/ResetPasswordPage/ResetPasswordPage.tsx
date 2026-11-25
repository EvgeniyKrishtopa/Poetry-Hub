import type { ResetPasswordPageProps } from "./ResetPasswordPage.types";

/**
 * The `/reset-password` content inside its own `<Suspense>`: reads `status` first (the done notice needs no
 * session), then the session: signed out redirects, `unknown` shows the unavailable alert, signed in shows the
 * form (password-recovery design D4).
 */
export function ResetPasswordPage(props: ResetPasswordPageProps): null {
  void props;
  return null;
}
