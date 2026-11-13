/** The header link's text (artboard 1). */
export const ADMIN_NAV_LABEL = "Админка";

/** The `/admin` list's fixed texts (artboard 41). */
export const ADMIN_LIST_COPY = {
  title: "Пользователи",
  emailLabel: "Электронная почта",
  findButton: "Найти",
  nextLink: "Далее",
  firstPageLink: "К первой странице",
  loading: "Загрузка…",
  empty: "Никого не нашли",
  loadFailed: "Не удалось загрузить пользователей",
} as const;

/** The state badge's text for each state (artboard 41). */
export const USER_STATE_LABELS = {
  active: "Активен",
  blocked: "Заблокирован",
  banned: "Забанен",
  admin: "Админ",
} as const;

/** The row buttons' text (artboard 41). */
export const ADMIN_ACTION_LABELS = {
  block: "Заблокировать",
  unblock: "Разблокировать",
  revoke: "Отозвать сессии",
  ban: "Забанить",
} as const;

/** The result line inside a row after an action that changed or checked something (artboard 41). */
export const MODERATION_RESULT_MESSAGES = {
  blocked: "Пользователь заблокирован",
  unblocked: "Пользователь разблокирован",
  revoked: "Сессии отозваны",
  // Not in the mockups (artboard 41 draws block, unblock, revoke only): placeholder for the ban result, to confirm.
  banned: "Пользователь забанен",
  "no-sessions": "Сессий не было",
} as const;

/** The failure line inside a row; one text per failure kind, permission and expired session kept apart (FR-12). */
export const MODERATION_FAILURE_MESSAGES = {
  "already-restricted": "Уже заблокирован",
  "not-blocked": "Не заблокирован",
  "target-is-admin": "Нельзя менять админа",
  "not-found": "Пользователь не найден",
  // Not in the mockups: placeholder for the permission failure and for `invalid`, to confirm.
  forbidden: "Недостаточно прав",
  unauthenticated: "Сессия истекла, войдите снова",
  unavailable: "Сервис недоступен",
  invalid: "Не удалось выполнить действие",
} as const;

/** The ban confirmation dialog (artboard 42); the description names the address. */
export const BAN_DIALOG_COPY = {
  title: "Забанить пользователя?",
  // Artboard 42 only says the description names the address; this wording is a placeholder, to confirm.
  description: (email: string): string =>
    `Пользователь ${email} не сможет войти, а этот адрес — зарегистрироваться снова.`,
  cancel: "Отмена",
  confirm: "Забанить",
} as const;

/** The delete control and its dialog on a public page, per kind (artboards 44 and 45). */
export const ADMIN_DELETE_COPY = {
  poem: {
    button: "Удалить произведение (админ)",
    dialogTitle: (title: string): string => `Удалить произведение «${title}»?`,
    dialogDescription: "Это действие нельзя отменить.",
    alreadyGone: "Произведение уже удалено",
  },
  collection: {
    button: "Удалить сборник (админ)",
    dialogTitle: (title: string): string => `Удалить сборник «${title}»?`,
    dialogDescription: "Произведения из сборника останутся у автора как свободные.",
    alreadyGone: "Сборник уже удалён",
  },
  cancel: "Отмена",
  confirm: "Удалить",
  failed: "Не удалось удалить",
} as const;
