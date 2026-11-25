import { describe, expect, it } from "vitest";

import {
  ACCOUNT_EXISTS_NOTICE,
  CONFIRM_FAILED_MESSAGE,
  GENERIC_SERVER_ERROR,
  getFailureMessage,
  getGoogleErrorMessage,
  getLoginErrorMessage,
  GOOGLE_BUTTON_LABEL,
  GOOGLE_SEPARATOR_LABEL,
  BACK_TO_SIGN_IN_LABEL,
  NEW_PASSWORD_LABEL,
  NEW_PASSWORD_SUBMIT_LABEL,
  PASSWORD_RESET_DONE_MESSAGE,
  PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE,
  RECOVERY_FAILED_MESSAGE,
  RECOVERY_OFFER_BUTTON_LABEL,
  RECOVERY_OFFER_TEXT,
  RECOVERY_SENT_MESSAGE,
  SIGN_OUT_FAILED_MESSAGE,
} from "../../model/auth-messages";
import type { AuthFailure, AuthFlow, UpdatePasswordFailure } from "../../model/auth.types";

const GENERIC = "Что-то пошло не так. Попробуйте ещё раз.";

describe("getFailureMessage", () => {
  // implements FR-2 of add-supabase-auth
  // implements FR-4 of add-supabase-auth
  it.each<[AuthFlow, AuthFailure, string]>([
    ["sign-in", "invalid-credentials", "Неверный адрес электронной почты или пароль."],
    ["sign-in", "email-not-confirmed", "Сначала подтвердите адрес электронной почты: ссылка в письме, которое мы отправили."],
    ["sign-in", "rate-limited", "Слишком много попыток. Попробуйте через несколько минут."],
    ["sign-in", "unavailable", "Вход сейчас недоступен."],
    ["sign-in", "unknown", GENERIC],
    ["sign-up", "rate-limited", "Слишком много попыток. Попробуйте через несколько минут."],
    ["sign-up", "weak-password", "Придумайте пароль надёжнее."],
    ["sign-up", "unavailable", "Регистрация сейчас недоступна."],
    ["sign-up", "unknown", GENERIC],
  ])("%s × %s → its text", (flow, failure, expected) => {
    expect(getFailureMessage(flow, failure)).toBe(expected);
  });

  it.each<[AuthFlow, AuthFailure]>([
    ["sign-in", "weak-password"],
    ["sign-up", "invalid-credentials"],
    ["sign-up", "email-not-confirmed"],
  ])("unlisted pair %s × %s → the generic text", (flow, failure) => {
    expect(getFailureMessage(flow, failure)).toBe(GENERIC);
  });
});

describe("standalone messages", () => {
  // implements FR-5 of add-supabase-auth
  // implements FR-7 of add-supabase-auth
  it("match the spec's exact texts", () => {
    expect(GENERIC_SERVER_ERROR).toBe(GENERIC);
    expect(CONFIRM_FAILED_MESSAGE).toBe(
      "Ссылка для подтверждения недействительна или устарела. Войдите или зарегистрируйтесь снова, чтобы получить новую ссылку.",
    );
    expect(SIGN_OUT_FAILED_MESSAGE).toBe("Не удалось выйти. Попробуйте ещё раз.");
  });
});

describe("getLoginErrorMessage", () => {
  // implements FR-5 of add-supabase-auth
  it("maps confirm-failed to the confirm-failed text", () => {
    expect(getLoginErrorMessage("confirm-failed")).toBe(CONFIRM_FAILED_MESSAGE);
  });

  it.each([["missing", undefined], ["another value", "oops"], ["a repeated param", ["confirm-failed", "x"]]])(
    "shows nothing for %s",
    (_label, error) => {
      expect(getLoginErrorMessage(error)).toBeUndefined();
    },
  );

  it("gives no text for a google-* value", () => {
    expect(getLoginErrorMessage("google-failed")).toBeUndefined();
  });
});

describe("Google texts", () => {
  // implements FR-G1 of google-sign-in
  it("match the spec's labels", () => {
    expect(GOOGLE_BUTTON_LABEL["sign-in"]).toBe("Войти через Google");
    expect(GOOGLE_BUTTON_LABEL["sign-up"]).toBe("Зарегистрироваться через Google");
    expect(GOOGLE_SEPARATOR_LABEL).toBe("или");
  });

  // implements FR-G6 of google-sign-in
  it("match the spec's account-exists notice", () => {
    expect(ACCOUNT_EXISTS_NOTICE).toBe("Аккаунт с этой почтой уже есть — вы вошли в него.");
  });
});

describe("getGoogleErrorMessage", () => {
  // implements FR-G4, FR-G5 of google-sign-in
  it.each([
    ["google-cancelled", "Вы отменили вход через Google. Попробуйте ещё раз."],
    ["google-failed", "Не удалось войти через Google. Попробуйте ещё раз."],
    ["google-blocked", "Вход с этим адресом невозможен."],
  ])("maps %s to its text", (error, expected) => {
    expect(getGoogleErrorMessage(error)).toBe(expected);
  });

  // implements FR-5 of google-sign-in
  it.each([
    ["missing", undefined],
    ["another value", "anything-else"],
    ["confirm-failed", "confirm-failed"],
    ["a prefix of a Google value", "google"],
    ["a repeated param", ["google-failed", "google-blocked"]],
  ])("gives no text for %s", (_label, error) => {
    expect(getGoogleErrorMessage(error)).toBeUndefined();
  });
});

describe("recovery flows' failure texts", () => {
  const RATE_LIMITED = "Слишком много попыток. Попробуйте через несколько минут.";
  const RECOVERY_UNAVAILABLE = "Восстановление пароля сейчас недоступно.";

  // implements FR-2, FR-8, FR-9 of password-recovery
  it.each<[AuthFlow, AuthFailure | UpdatePasswordFailure, string]>([
    ["recovery-request", "rate-limited", RATE_LIMITED],
    ["recovery-request", "unavailable", RECOVERY_UNAVAILABLE],
    ["recovery-request", "unknown", GENERIC],
    ["update-password", "rate-limited", RATE_LIMITED],
    ["update-password", "unavailable", RECOVERY_UNAVAILABLE],
    ["update-password", "link-expired", "Ссылка для восстановления устарела. Запросите новое письмо."],
    ["update-password", "same-password", "Новый пароль должен отличаться от прежнего."],
    ["update-password", "weak-password", "Придумайте пароль надёжнее."],
    ["update-password", "unknown", GENERIC],
  ])("%s × %s → its text", (flow, failure, expected) => {
    expect(getFailureMessage(flow, failure)).toBe(expected);
  });

  // implements FR-10 of password-recovery
  it.each<[AuthFlow, AuthFailure | UpdatePasswordFailure]>([
    ["recovery-request", "restricted"],
    ["recovery-request", "invalid-credentials"],
    ["recovery-request", "link-expired"],
    ["update-password", "restricted"],
    ["update-password", "invalid-credentials"],
    ["update-password", "email-not-confirmed"],
  ])("unlisted pair %s × %s → the generic text, never a block wording", (flow, failure) => {
    expect(getFailureMessage(flow, failure)).toBe(GENERIC);
  });

  // implements FR-5 of password-recovery
  it("leaves the sign-in and sign-up flows without the recovery-only kinds", () => {
    expect(getFailureMessage("sign-in", "same-password")).toBe(GENERIC);
    expect(getFailureMessage("sign-up", "same-password")).toBe(GENERIC);
    expect(getFailureMessage("sign-in", "link-expired")).toBe(GENERIC);
  });

  // implements FR-5 of password-recovery
  it("repeats the sign-up text for a weak password in the update flow", () => {
    expect(getFailureMessage("update-password", "weak-password")).toBe(getFailureMessage("sign-up", "weak-password"));
  });

  // implements FR-10 of password-recovery
  it("never says that an address or account is blocked", () => {
    const texts = [
      RECOVERY_FAILED_MESSAGE,
      RECOVERY_SENT_MESSAGE,
      PASSWORD_RESET_DONE_MESSAGE,
      PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE,
      ...(["rate-limited", "unavailable", "link-expired", "same-password", "weak-password", "unknown"] as const).map(
        (failure) => getFailureMessage("update-password", failure),
      ),
      ...(["rate-limited", "unavailable", "unknown"] as const).map((failure) =>
        getFailureMessage("recovery-request", failure),
      ),
    ];

    for (const text of texts) expect(text).not.toMatch(/заблокирован|блокиров/i);
  });
});

describe("recovery standalone texts", () => {
  // implements FR-1, FR-2, FR-3, FR-4, FR-6 of password-recovery
  it("match the spec's exact texts", () => {
    expect(RECOVERY_FAILED_MESSAGE).toBe(
      "Ссылка для восстановления недействительна или устарела. Введите адрес электронной почты и запросите новое письмо.",
    );
    expect(RECOVERY_OFFER_TEXT).toBe(
      "Забыли пароль? Мы можем отправить на этот адрес письмо со ссылкой для восстановления.",
    );
    expect(RECOVERY_OFFER_BUTTON_LABEL).toBe("Отправить письмо");
    expect(RECOVERY_SENT_MESSAGE).toBe(
      "Если для этого адреса есть аккаунт, мы отправили письмо со ссылкой для восстановления пароля. Ссылка действует 1 час.",
    );
    expect(NEW_PASSWORD_LABEL).toBe("Новый пароль");
    expect(NEW_PASSWORD_SUBMIT_LABEL).toBe("Сохранить пароль");
    expect(BACK_TO_SIGN_IN_LABEL).toBe("Перейти ко входу");
    expect(PASSWORD_RESET_DONE_MESSAGE).toBe("Пароль изменён. Войдите с новым паролем.");
    expect(PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE).toBe(
      "Пароль изменён, но завершить прежние сессии не удалось. Если пароль знал кто-то ещё, смените его ещё раз позже.",
    );
  });
});
