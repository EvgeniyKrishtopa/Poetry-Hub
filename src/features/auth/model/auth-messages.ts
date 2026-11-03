import { CONFIRM_FAILED_ERROR } from "./auth.constants";
import type { AuthFailure, AuthFlow } from "./auth.types";

export const GENERIC_SERVER_ERROR = "Что-то пошло не так. Попробуйте ещё раз.";

export const CONFIRM_FAILED_MESSAGE =
  "Ссылка для подтверждения недействительна или устарела. Войдите или зарегистрируйтесь снова, чтобы получить новую ссылку.";

export const SIGN_OUT_FAILED_MESSAGE = "Не удалось выйти. Попробуйте ещё раз.";

/** The header's account link to the authors' account page (add-author-profiles FR-3). */
export const ACCOUNT_LINK_LABEL = "Мастерская поэта";

export const CHECK_EMAIL_TITLE = "Проверьте почту";

/** The `/login` notice after a write found the session expired (delete-poem FR-6): the profile editor's text. */
export const SESSION_EXPIRED_NOTICE = "Сессия истекла. Войдите снова.";

/** The `/login` alert for its `error` search param, or none for any other value. */
export function getLoginErrorMessage(error: string | string[] | undefined): string | undefined {
  return error === CONFIRM_FAILED_ERROR ? CONFIRM_FAILED_MESSAGE : undefined;
}

const RATE_LIMITED_MESSAGE = "Слишком много попыток. Попробуйте через несколько минут.";

export const FIELD_MESSAGES = {
  emailInvalid: "Введите корректный адрес электронной почты.",
  passwordRequired: "Введите пароль.",
  // The noun's plural form fits MIN_PASSWORD_LENGTH (8); a length of 1-4 or 21+ needs another form.
  passwordTooShort: (minLength: number) => `Не менее ${minLength} символов.`,
} as const;

/**
 * Each flow lists only the texts its FR defines; an unlisted pair falls back to the generic
 * text and never borrows the other flow's wording (design D7).
 */
const FAILURE_MESSAGES: Readonly<Record<AuthFlow, Readonly<Partial<Record<AuthFailure, string>>>>> = {
  "sign-in": {
    "invalid-credentials": "Неверный адрес электронной почты или пароль.",
    "email-not-confirmed": "Сначала подтвердите адрес электронной почты: ссылка в письме, которое мы отправили.",
    "rate-limited": RATE_LIMITED_MESSAGE,
    unavailable: "Вход сейчас недоступен.",
  },
  "sign-up": {
    "rate-limited": RATE_LIMITED_MESSAGE,
    "weak-password": "Придумайте пароль надёжнее.",
    unavailable: "Регистрация сейчас недоступна.",
  },
};

export function getFailureMessage(flow: AuthFlow, failure: AuthFailure): string {
  return FAILURE_MESSAGES[flow][failure] ?? GENERIC_SERVER_ERROR;
}
