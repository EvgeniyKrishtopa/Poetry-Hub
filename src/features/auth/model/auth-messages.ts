import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";

import { CONFIRM_FAILED_ERROR, GOOGLE_ERROR, GOOGLE_FLOW } from "./auth.constants";
import type { AuthFailure, AuthFlow, GoogleFlow, UpdatePasswordFailure } from "./auth.types";

export const GENERIC_SERVER_ERROR = "Что-то пошло не так. Попробуйте ещё раз.";

/** The `/login` alert for `error=recovery-failed`: the same for an expired, used, blocked or broken link (password-recovery FR-3). */
export const RECOVERY_FAILED_MESSAGE =
  "Ссылка для восстановления недействительна или устарела. Введите адрес электронной почты и запросите новое письмо.";

/** The recovery offer under a wrong-credentials alert, and its button (password-recovery FR-1). */
export const RECOVERY_OFFER_TEXT = "Забыли пароль? Мы можем отправить на этот адрес письмо со ссылкой для восстановления.";
export const RECOVERY_OFFER_BUTTON_LABEL = "Отправить письмо";

/** The neutral notice after `sent`, whatever the address holds; names the link's 1 hour (password-recovery FR-2). */
export const RECOVERY_SENT_MESSAGE =
  "Если для этого адреса есть аккаунт, мы отправили письмо со ссылкой для восстановления пароля. Ссылка действует 1 час.";

/** The `/reset-password` form's field and button (password-recovery FR-4). */
export const NEW_PASSWORD_LABEL = "Новый пароль";
export const NEW_PASSWORD_SUBMIT_LABEL = "Сохранить пароль";

/** The link under the done notices and the link-expired alert (password-recovery FR-6, FR-8). */
export const BACK_TO_SIGN_IN_LABEL = "Перейти ко входу";

/** The done notice of `?status=updated` (password-recovery FR-6). */
export const PASSWORD_RESET_DONE_MESSAGE = "Пароль изменён. Войдите с новым паролем.";

/** The done notice of `?status=updated-sign-out-failed`: says honestly that the old sessions may live on (FR-6). */
export const PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE =
  "Пароль изменён, но завершить прежние сессии не удалось. Если пароль знал кто-то ещё, смените его ещё раз позже.";

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

/** `ConnectionNotice`'s texts above the Google button: it signs in, it does not save (google-sign-in FR-G2). */
export const GOOGLE_CONNECTION_MESSAGES = {
  [CONNECTION_STATUS.offline]:
    "Нет подключения к интернету. Вход через Google станет доступен, когда связь восстановится.",
  [CONNECTION_STATUS.slow]: "Медленное подключение к интернету. Вход через Google станет доступен, когда связь улучшится.",
} as const;

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

const WEAK_PASSWORD_MESSAGE = "Придумайте пароль надёжнее.";

const RECOVERY_UNAVAILABLE_MESSAGE = "Восстановление пароля сейчас недоступно.";

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
const FAILURE_MESSAGES: Readonly<
  Record<AuthFlow, Readonly<Partial<Record<AuthFailure | UpdatePasswordFailure, string>>>>
> = {
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
    "weak-password": WEAK_PASSWORD_MESSAGE,
    unavailable: "Регистрация сейчас недоступна.",
  },
  "recovery-request": {
    "rate-limited": RATE_LIMITED_MESSAGE,
    unavailable: RECOVERY_UNAVAILABLE_MESSAGE,
  },
  "update-password": {
    "rate-limited": RATE_LIMITED_MESSAGE,
    "link-expired": "Ссылка для восстановления устарела. Запросите новое письмо.",
    "same-password": "Новый пароль должен отличаться от прежнего.",
    "weak-password": WEAK_PASSWORD_MESSAGE,
    unavailable: RECOVERY_UNAVAILABLE_MESSAGE,
  },
};

export function getFailureMessage(flow: AuthFlow, failure: AuthFailure | UpdatePasswordFailure): string {
  return FAILURE_MESSAGES[flow][failure] ?? GENERIC_SERVER_ERROR;
}
