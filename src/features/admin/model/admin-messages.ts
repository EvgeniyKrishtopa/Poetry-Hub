import { CASE_STATUS, VIOLATION_GROUND, VIOLATION_LIST_LIMIT, WARNING_MESSAGE_MAX_LENGTH } from "./violation.constants";
import type { CaseFailureReason, CaseStatus, ViolationGround } from "./violation.types";

/** The header link's text (artboard 1). */
export const ADMIN_NAV_LABEL = "Админка";

/** The `/admin` list's fixed texts (artboard 41). */
export const ADMIN_LIST_COPY = {
  title: "Пользователи",
  nextLink: "Далее",
  firstPageLink: "К первой странице",
  loading: "Загрузка…",
  empty: "Никого не нашли",
  loadFailed: "Не удалось загрузить пользователей",
  joinedLabel: "Регистрация:",
  lastSignInLabel: "Последний вход:",
  noDate: "—",
} as const;

/** The state badge's text for each state (artboard 41). */
export const USER_STATE_LABELS = {
  active: "Активен",
  blocked: "Заблокирован",
  banned: "Забанен",
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
  description: (email: string): string =>
    `${email} не сможет войти, писать и зарегистрироваться снова с этим адресом. Отменить бан в приложении нельзя.`,
  close: "Закрыть",
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
  close: "Закрыть",
  cancel: "Отмена",
  confirm: "Удалить",
  failed: "Не удалось удалить",
} as const;

/**
 * The delete dialog's failure line (FR-12): a permission failure and an expired session keep their own texts, reused
 * from the rows; an outage or a rejected input shows the mockup's «Не удалось удалить» (artboards 44 and 45).
 * `not-found` is not a failure here: the control shows its «already gone» line instead.
 */
export const ADMIN_DELETE_FAILURE_MESSAGES = {
  forbidden: MODERATION_FAILURE_MESSAGES.forbidden,
  unauthenticated: MODERATION_FAILURE_MESSAGES.unauthenticated,
  unavailable: ADMIN_DELETE_COPY.failed,
  invalid: ADMIN_DELETE_COPY.failed,
} as const;

/** The `/admin` additions: the review-list link, the add button and the drag handle (artboards 41 and 48). */
export const ADMIN_VIOLATION_COPY = {
  listLink: "Список нарушителей",
  addButton: "В список нарушителей",
  dropCaption: "Отпустите, чтобы добавить",
  grabLabel: (email: string): string => `Переместить пользователя ${email}`,
  dragInstructions:
    "Перетащите строку на ссылку «Список нарушителей». С клавиатуры используйте кнопку «В список нарушителей».",
} as const;

/** The result line after adding from `/admin` (artboard 48). */
export const ADD_CASE_RESULT_MESSAGES = {
  added: "Пользователь добавлен в список нарушителей",
  "already-in-list": "Уже в списке нарушителей",
} as const;

/** The add control on the author, poem and collection pages (artboard 52). */
export const ADD_TO_VIOLATIONS_COPY = {
  button: "В список нарушителей (админ)",
  added: "Автор добавлен в список нарушителей",
  "already-in-list": "Автор уже в списке нарушителей",
} as const;

/**
 * The «show on the home page» control on the poem and author pages (artboards AdminHomeBtnPoem, AdminHomeBtnPoem2 and
 * AdminHomeBtnAuthor). The limit line names the cap of four in the plural form that fits it.
 */
export const ADD_TO_HOME_COPY = {
  button: "Показать на главной",
  added: "Показано на главной.",
  alreadyInList: "Уже показано на главной.",
  limitReached: {
    poem: "На главной уже 4 произведения. Уберите одно на странице /admin/home.",
    author: "На главной уже 4 автора. Уберите одного на странице /admin/home.",
  },
  notFound: {
    poem: "Не удалось найти это произведение.",
    author: "Не удалось найти этого автора.",
  },
  failed: "Не удалось сохранить. Попробуйте ещё раз.",
  // An expired session and a refused admin check keep the texts the rows already use: a retry would not help there.
  forbidden: MODERATION_FAILURE_MESSAGES.forbidden,
  unauthenticated: MODERATION_FAILURE_MESSAGES.unauthenticated,
} as const;

/**
 * The one-time line on the author page after an admin delete whose email did not go out (artboard 53), per kind of
 * what was deleted. `noAddress` follows it, for an author whose account holds no address.
 */
export const DELETE_NOTICE_FAILED_COPY = {
  poem: "Произведение удалено, но письмо автору не отправлено",
  collection: "Сборник удалён, но письмо автору не отправлено",
  noAddress: ": у автора нет адреса почты",
} as const;

/**
 * The failure line of a case action, one text per reason (artboards 48 and 49). Reasons the user rows already
 * have reuse their texts; `content-not-found` has a text per kind of content (`CONTENT_GONE_MESSAGES`).
 */
export const CASE_FAILURE_MESSAGES = {
  "already-restricted": MODERATION_FAILURE_MESSAGES["already-restricted"],
  "target-is-admin": MODERATION_FAILURE_MESSAGES["target-is-admin"],
  "not-found": MODERATION_FAILURE_MESSAGES["not-found"],
  "case-not-found": "Случая больше нет",
  forbidden: MODERATION_FAILURE_MESSAGES.forbidden,
  unauthenticated: MODERATION_FAILURE_MESSAGES.unauthenticated,
  unavailable: MODERATION_FAILURE_MESSAGES.unavailable,
  invalid: MODERATION_FAILURE_MESSAGES.invalid,
} as const satisfies Record<Exclude<CaseFailureReason, "content-not-found">, string>;

/** The prompting poem or collection is already deleted, so no case would be recorded (artboard 48). */
export const CONTENT_GONE_MESSAGES = {
  poem: ADMIN_DELETE_COPY.poem.alreadyGone,
  collection: ADMIN_DELETE_COPY.collection.alreadyGone,
} as const;

/** The two grounds in the admin's terms: the pill and the choice card (artboards 48 and 49). */
export const GROUND_COPY = {
  [VIOLATION_GROUND.harmfulContent]: {
    label: "Вредный текст",
    description:
      "Призывы к насилию и жестокости, унижение человека, оправдание принуждения. Сначала предупреждение, затем сутки на реакцию.",
  },
  [VIOLATION_GROUND.maliciousActivity]: {
    label: "Злонамеренные действия",
    description: "Попытки XSS, DoS и другие действия, компрометирующие сайт. Без предупреждения.",
  },
} as const satisfies Record<ViolationGround, { readonly label: string; readonly description: string }>;

/** The ground choice dialog (artboard 48); the description names the user, a note names the prompting content. */
export const GROUND_CHOICE_COPY = {
  title: "Добавить в список нарушителей?",
  description: (subject: string): string => `${subject} попадёт в список на рассмотрение. Выберите основание.`,
  contentNote: {
    poem: (title: string): string => `Произведение «${title}» будет записано как повод.`,
    collection: (title: string): string => `Сборник «${title}» будет записан как повод.`,
  },
  groupLabel: "Основание",
  close: "Закрыть",
  cancel: "Отмена",
  confirm: "Добавить",
} as const;

/** `/admin/violations`'s fixed texts (artboard 49). */
export const VIOLATIONS_PAGE_COPY = {
  title: "Список нарушителей",
  empty: "В списке никого нет",
  loadFailed: "Не удалось загрузить список",
  capReached: `Показаны первые ${VIOLATION_LIST_LIMIT} случаев, есть ещё`,
  addedOn: (date: string): string => `В списке с ${date}`,
  deadline: (when: string): string => `Срок до ${when}`,
  contentLabel: { poem: "Повод: произведение", collection: "Повод: сборник" },
  contentGone: { poem: "Повод: произведение удалено", collection: "Повод: сборник удалён" },
} as const;

/** The status pill's text for each derived status (artboard 49). */
export const CASE_STATUS_LABELS = {
  [CASE_STATUS.waiting]: "Ожидает решения",
  [CASE_STATUS.warned]: "Предупреждён",
  [CASE_STATUS.deadlinePassed]: "Срок истёк",
} as const satisfies Record<CaseStatus, string>;

/** The case row's buttons (artboard 49); block and ban keep the user rows' words. */
export const CASE_ACTION_LABELS = {
  warn: "Отправить предупреждение",
  switchGround: "Сменить основание",
  block: ADMIN_ACTION_LABELS.block,
  ban: ADMIN_ACTION_LABELS.ban,
  remove: "Убрать из списка",
} as const;

/** The result line inside a case row after a ground switch or a warning (artboard 49). */
export const CASE_RESULT_MESSAGES = {
  groundChanged: "Основание изменено",
  warned: "Предупреждение отправлено",
  alreadyWarned: "Предупреждение уже отправлено",
  // Not in the mockups: placeholder for a warning refused because the ground was switched elsewhere, to confirm.
  wrongGround: "Основание уже изменено, предупреждение не отправлено",
} as const;

/** What follows «Пользователь заблокирован» or «Пользователь забанен» once the standard email was tried (FR-14). */
export const NOTICE_RESULT_SUFFIX = {
  sent: ". Письмо отправлено",
  failed: ", но письмо не отправлено",
  noAddress: ", адреса почты нет",
} as const;

/** The confirmation of a block before a harmful-content case's deadline (artboard 51); the ban dialog reuses the notes. */
export const EARLY_BLOCK_COPY = {
  title: "Заблокировать до истечения срока?",
  notWarned: "Предупреждение ещё не отправлено.",
  deadlineOpen: (deadline: string): string => `Срок на реакцию истекает ${deadline}.`,
  close: "Закрыть",
  cancel: "Отмена",
  confirm: ADMIN_ACTION_LABELS.block,
} as const;

/** The warning dialog (artboard 50). */
export const WARN_DIALOG_COPY = {
  title: "Предупреждение пользователю",
  description: "Письмо уйдёт на адрес ниже. К вашему тексту добавится стандартный блок: причина и сутки на реакцию.",
  toLabel: "Кому",
  messageLabel: "Сообщение",
  hint: `До ${WARNING_MESSAGE_MAX_LENGTH} символов`,
  emptyError: "Введите сообщение",
  tooLongError: `Не больше ${WARNING_MESSAGE_MAX_LENGTH} символов`,
  close: "Закрыть",
  cancel: "Отмена",
  send: "Отправить",
  notSent: "Письмо не отправлено. Попробуйте ещё раз",
  notConfigured: "Отправка почты не настроена",
  unknownOutcome: "Не уверены, что письмо ушло. Текст зафиксирован, повторите отправку",
  // Not in the mockups: placeholder for a user with no address, to confirm.
  noAddress: "У пользователя нет адреса почты",
} as const;

/** The `/admin/home` page (artboards AdminHomeA, AdminHomeB and AdminHomeC), the lists' texts and the live announcements. */
export const ADMIN_HOME_PAGE_COPY = {
  title: "Главная страница",
  navLink: "Главная на сайте",
  headings: { poem: "Произведения", author: "Авторы" },
  empty: {
    poem: "Пока ничего не выбрано. Откройте страницу произведения и нажмите «Показать на главной».",
    author: "Пока ничего не выбрано. Откройте страницу автора и нажмите «Показать на главной».",
  },
  notShown: "не показывается на главной",
  removeButton: "Убрать",
  removeLabel: (label: string): string => `Убрать «${label}» с главной`,
  handleLabel: (label: string): string => `Переместить «${label}»`,
  dragInstructions: "Пробел — взять строку, стрелки — изменить позицию, пробел — положить, Esc — отменить.",
  moveFailed: "Не удалось сохранить порядок. Попробуйте ещё раз.",
  stale: "Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.",
  loadFailed: "Не удалось загрузить главную страницу. Попробуйте позже.",
  picked: (label: string, position: number, total: number): string =>
    `Выбрано: «${label}», позиция ${position} из ${total}. Стрелками измените позицию, пробел — положить, Esc — отменить.`,
  moved: (position: number, total: number): string => `Позиция ${position} из ${total}.`,
  dropped: (position: number, total: number): string => `Положено на позицию ${position} из ${total}.`,
  cancelled: "Перемещение отменено.",
} as const;

/** `/admin/verify`: both screens' texts (artboards 67 and 68). */
export const ADMIN_VERIFY_COPY = {
  enrolTitle: "Второй код для входа в админку",
  enrolIntro:
    "Чтобы входить в админку, нужно подтверждать вход одноразовым кодом из приложения-аутентификатора. Настройте его один раз — это займёт минуту.",
  startButton: "Настроить",
  loading: "Получаем QR-код…",
  scanIntro: "Отсканируйте QR-код в приложении-аутентификаторе или введите секрет вручную. Затем введите код из приложения.",
  qrAlt: "QR-код для приложения-аутентификатора",
  secretLabel: "Секрет для ручного ввода",
  codeTitle: "Подтверждение входа",
  codeIntro: "Введите код из приложения-аутентификатора, чтобы войти в админку.",
  codeLabel: "Код из приложения",
  submitButton: "Подтвердить",
  wrongCode: "Неверный код. Попробуйте ещё раз.",
  limited: "Слишком много попыток. Попробуйте через несколько минут.",
} as const;
