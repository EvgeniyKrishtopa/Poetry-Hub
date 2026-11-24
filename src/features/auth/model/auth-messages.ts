import { CONFIRM_FAILED_ERROR, GOOGLE_ERROR, GOOGLE_FLOW } from "./auth.constants";
import type { AuthFailure, AuthFlow, GoogleFlow } from "./auth.types";

export const GENERIC_SERVER_ERROR = "Что-то пошло не так. Попробуйте ещё раз.";

export const CONFIRM_FAILED_MESSAGE =
  "Ссылка для подтверждения недействительна или устарела. Войдите или зарегистрируйтесь снова, чтобы получить новую ссылку.";

export const SIGN_OUT_FAILED_MESSAGE = "Не удалось выйти. Попробуйте ещё раз.";

/** The header's account link to the authors' account page (add-author-profiles FR-3). */
export const ACCOUNT_LINK_LABEL = "Мастерская поэта";

export const CHECK_EMAIL_TITLE = "Проверьте почту";

/** The document titles of `/login` and `/signup`: the pages' own headings (seo-metadata FR-7). */
export const SIGN_IN_PAGE_TITLE = "Вход";
export const SIGN_UP_PAGE_TITLE = "Регистрация";

/** The `/login` notice after a write found the session expired (delete-poem FR-6): the profile editor's text. */
export const SESSION_EXPIRED_NOTICE = "Сессия истекла. Войдите снова.";

/** The `/login` alert for its `error` search param, or none for any other value. */
export function getLoginErrorMessage(error: string | string[] | undefined): string | undefined {
  return error === CONFIRM_FAILED_ERROR ? CONFIRM_FAILED_MESSAGE : undefined;
}

/** The Google button's label on each page (google-sign-in FR-G1). */
export const GOOGLE_BUTTON_LABEL: Readonly<Record<GoogleFlow, string>> = {
  [GOOGLE_FLOW.signIn]: "Войти через Google",
  [GOOGLE_FLOW.signUp]: "Зарегистрироваться через Google",
};

/** The separator between the password form and the Google button (google-sign-in design D6). */
export const GOOGLE_SEPARATOR_LABEL = "или";

/** Also the text of a failed start (google-sign-in FR-G1, FR-G4). */
export const GOOGLE_FAILED_MESSAGE = "Не удалось войти через Google. Попробуйте ещё раз.";

/** Says that the address cannot be used, never why (google-sign-in FR-G5). */
export const GOOGLE_BLOCKED_MESSAGE = "Вход с этим адресом невозможен.";

export const GOOGLE_CANCELLED_MESSAGE = "Вы отменили вход через Google. Попробуйте ещё раз.";

/** The `/` notice after a Google sign-up into an existing account (google-sign-in FR-G6). */
export const ACCOUNT_EXISTS_NOTICE = "Аккаунт с этой почтой уже есть — вы вошли в него.";

const GOOGLE_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  [GOOGLE_ERROR.cancelled, GOOGLE_CANCELLED_MESSAGE],
  [GOOGLE_ERROR.failed, GOOGLE_FAILED_MESSAGE],
  [GOOGLE_ERROR.blocked, GOOGLE_BLOCKED_MESSAGE],
]);

/** The Google notice for a `google-*` `error` search param, or none for any other value (google-sign-in design D6). */
export function getGoogleErrorMessage(error: string | string[] | undefined): string | undefined {
  return typeof error === "string" ? GOOGLE_ERROR_MESSAGES.get(error) : undefined;
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
    // Says that the account is blocked, never why (FR-16).
    restricted: "Аккаунт заблокирован.",
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
