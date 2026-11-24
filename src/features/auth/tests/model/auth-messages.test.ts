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
  SIGN_OUT_FAILED_MESSAGE,
} from "../../model/auth-messages";
import type { AuthFailure, AuthFlow } from "../../model/auth.types";

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
