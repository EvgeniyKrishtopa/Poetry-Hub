import { FIELD_MESSAGES, getFailureMessage } from "../../model/auth-messages";
import type { RecoveryOfferResult, SignInFormState } from "../../model/auth.types";

import { getFormError } from "./get-form-error";

interface RecoveryViewInput {
  readonly signIn: SignInFormState;
  readonly initialError: string | undefined;
  /** `/login` was opened with `error=recovery-failed`: the offer shows until the first sign-in submit. */
  readonly offerOnLoad: boolean;
  /** The recovery result of the current sign-in attempt only; an older attempt's is already dropped. */
  readonly recovery: RecoveryOfferResult;
}

export interface RecoveryView {
  /** The danger text of the form's top alert slot: the recovery failure, else the sign-in failure. */
  readonly alert: string | undefined;
  /** A rejected captcha at sign-in: shown above the check block instead of the top slot. */
  readonly captchaAlert: string | undefined;
  /** The neutral «sent» notice, which takes the alert slot in place of the danger alert. */
  readonly sentNotice: boolean;
  readonly offerVisible: boolean;
  /** The text under the email field, for an invalid address in the recovery request. */
  readonly emailError: string | undefined;
}

/**
 * Wrong credentials make the offer appear, whatever the address (FR-1); any other sign-in result hides it, and so
 * does the first sign-in submit after a dead recovery link. Only the offer's own results count while it is shown.
 */
function isOfferVisible(signIn: SignInFormState, offerOnLoad: boolean): boolean {
  if (signIn.status === "idle") return offerOnLoad;
  return signIn.status === "failed" && signIn.failure === "invalid-credentials";
}

/** What the sign-in form shows for its two actions' results (password-recovery design D2). */
export function getRecoveryView({ signIn, initialError, offerOnLoad, recovery }: RecoveryViewInput): RecoveryView {
  const offerVisible = isOfferVisible(signIn, offerOnLoad);
  const result = offerVisible ? recovery : ({ status: "idle" } as const);
  const view: RecoveryView = {
    alert: undefined,
    captchaAlert: undefined,
    sentNotice: false,
    offerVisible,
    emailError: undefined,
  };

  if (result.status === "sent") return { ...view, sentNotice: true };
  if (result.status === "invalid") return { ...view, emailError: FIELD_MESSAGES.emailInvalid };
  if (result.status === "failed") {
    const alert = getFailureMessage("recovery-request", result.failure);
    return { ...view, alert };
  }

  const signInError = getFormError(signIn, initialError);
  const captchaRejected = signIn.status === "failed" && signIn.failure === "captcha";
  if (captchaRejected) return { ...view, captchaAlert: signInError };
  return { ...view, alert: signInError };
}
