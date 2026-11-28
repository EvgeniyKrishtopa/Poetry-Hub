import { describe, expect, it } from "vitest";

import { getRecoveryView } from "../../components/SignInForm/get-recovery-view";
import { CAPTCHA_FAILED_MESSAGE, RECOVERY_FAILED_MESSAGE } from "../../model/auth-messages";
import type { RecoveryOfferResult, SignInFormState } from "../../model/auth.types";

const IDLE: SignInFormState = { status: "idle", email: "" };
const WRONG: SignInFormState = { status: "failed", email: "", failure: "invalid-credentials" };
const NONE: RecoveryOfferResult = { status: "idle" };

describe("getRecoveryView", () => {
  // implements FR-1 of password-recovery
  it("offers a letter after wrong credentials and keeps the sign-in alert", () => {
    const view = getRecoveryView({ signIn: WRONG, initialError: undefined, offerOnLoad: false, recovery: NONE });

    expect(view).toEqual({
      alert: "Неверный адрес электронной почты или пароль.",
      captchaAlert: undefined,
      sentNotice: false,
      offerVisible: true,
      emailError: undefined,
    });
  });

  // implements FR-1, FR-3 of password-recovery
  it("offers a letter on a dead link until the first sign-in submit", () => {
    const onLoad = getRecoveryView({
      signIn: IDLE,
      initialError: RECOVERY_FAILED_MESSAGE,
      offerOnLoad: true,
      recovery: NONE,
    });
    const afterSubmit = getRecoveryView({
      signIn: { status: "failed", email: "", failure: "rate-limited" },
      initialError: RECOVERY_FAILED_MESSAGE,
      offerOnLoad: true,
      recovery: NONE,
    });

    expect(onLoad).toMatchObject({ alert: RECOVERY_FAILED_MESSAGE, offerVisible: true });
    expect(afterSubmit).toMatchObject({ offerVisible: false });
    expect(afterSubmit.alert).not.toBe(RECOVERY_FAILED_MESSAGE);
  });

  // implements FR-1 of password-recovery
  it("never offers a letter on a fresh form or after a field error", () => {
    const fresh = getRecoveryView({ signIn: IDLE, initialError: undefined, offerOnLoad: false, recovery: NONE });
    const invalid = getRecoveryView({
      signIn: { status: "invalid", email: "", fieldErrors: {} },
      initialError: undefined,
      offerOnLoad: false,
      recovery: NONE,
    });

    expect(fresh.offerVisible).toBe(false);
    expect(invalid.offerVisible).toBe(false);
  });

  // implements FR-2 of password-recovery
  it.each<[string, RecoveryOfferResult, Partial<ReturnType<typeof getRecoveryView>>]>([
    ["sent", { status: "sent" }, { alert: undefined, sentNotice: true }],
    ["invalid", { status: "invalid" }, { alert: undefined, emailError: "Введите корректный адрес электронной почты." }],
    [
      "failed",
      { status: "failed", failure: "rate-limited" },
      { alert: "Слишком много попыток. Попробуйте через несколько минут.", sentNotice: false },
    ],
  ])("shows a %s recovery result in place of the sign-in alert", (_label, recovery, expected) => {
    const view = getRecoveryView({ signIn: WRONG, initialError: undefined, offerOnLoad: false, recovery });

    expect(view).toMatchObject({ offerVisible: true, ...expected });
  });

  // implements FR-5 of pre-deploy-security-hardening
  it("puts a rejected captcha at sign-in next to the check block, with no top alert and no offer", () => {
    const view = getRecoveryView({
      signIn: { status: "failed", email: "", failure: "captcha" },
      initialError: undefined,
      offerOnLoad: false,
      recovery: NONE,
    });

    expect(view).toMatchObject({ alert: undefined, captchaAlert: CAPTCHA_FAILED_MESSAGE, offerVisible: false });
  });

  // implements FR-1 of password-recovery
  it("ignores a recovery result while the offer is hidden", () => {
    const view = getRecoveryView({
      signIn: { status: "failed", email: "", failure: "unknown" },
      initialError: undefined,
      offerOnLoad: false,
      recovery: { status: "sent" },
    });

    expect(view.sentNotice).toBe(false);
    expect(view.offerVisible).toBe(false);
  });
});
