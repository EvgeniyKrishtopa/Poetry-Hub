import { COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_TITLE_MAX_LENGTH } from "./collection-management.constants";
import type { CreateCollectionFailure, UpdateCollectionFailure } from "./collection-management.types";

// Every string of the proposal's UI copy table this feature shows, verbatim and in Russian.

/** `/account/poems`: the create link, the section, and the one-time notices (FR-1, FR-2, FR-4, FR-13). */
export const COLLECTION_LIST_COPY = {
  createLink: "Создать сборник произведений",
  sectionHeading: "Сборники произведений",
  sectionUnavailable: "Не удалось загрузить сборники. Попробуйте позже.",
  created: (title: string) => `Сборник «${title}» создан.`,
  deleted: (title: string) => `Сборник «${title}» удалён.`,
  alreadyDeleted: "Сборник уже удалён.",
} as const;

/** The fields both forms render (FR-3, FR-7). */
export const COLLECTION_FORM_COPY = {
  titleLabel: "Название сборника",
  descriptionLabel: "Описание (необязательно)",
  // The poem pages' text: the skeletons' screen-reader status.
  loading: "Загрузка…",
} as const;

export const COLLECTION_FIELD_ERRORS = {
  required: "Обязательное поле.",
  titleTooLong: `Не более ${COLLECTION_TITLE_MAX_LENGTH} символов.`,
  descriptionTooLong: `Не более ${COLLECTION_DESCRIPTION_MAX_LENGTH} символов.`,
} as const;

/** The create page (FR-3, FR-4, FR-5). */
export const NEW_COLLECTION_COPY = {
  heading: "Создание сборника",
  submit: "Создать сборник",
  submitPending: "Создание…",
  notPublic: "Чтобы создавать сборники, укажите имя и фамилию в профиле автора.",
  profileEditorLink: "Перейти к профилю автора",
} as const;

/** The create form's failure alert, one text per failure that keeps the author on the page (FR-4, FR-5). */
export const CREATE_COLLECTION_FAILURE_MESSAGES: Readonly<Record<Exclude<CreateCollectionFailure, "unauthenticated">, string>> =
  {
    "not-public": NEW_COLLECTION_COPY.notPublic,
    "too-many-collections": "Слишком много новых сборников. Попробуйте позже.",
    unavailable: "Сохранение сейчас недоступно. Попробуйте позже.",
    unknown: "Что-то пошло не так. Попробуйте ещё раз.",
  };

/** The collection page and its delete dialog (FR-6, FR-9, FR-13). */
export const COLLECTION_PAGE_COPY = {
  edit: "Редактировать сборник",
  delete: "Удалить сборник",
  saved: "Изменения сохранены.",
  dialogTitle: "Удалить сборник?",
  dialogBody: (title: string) => `Сборник «${title}» будет удалён без возможности восстановления.`,
  cancel: "Отмена",
  confirm: "Удалить",
  confirmPending: "Удаление…",
  close: "Закрыть",
  deleteFailure: "Не удалось удалить сборник. Попробуйте позже.",
} as const;

/** The edit page (FR-7, FR-8, FR-9). */
export const EDIT_COLLECTION_COPY = {
  heading: "Редактирование сборника",
  submit: "Сохранить изменения",
  submitPending: "Сохранение…",
  discard: "Отменить изменения",
  backToCollection: "Вернуться к сборнику",
} as const;

/** The edit form's failure alert (FR-10, FR-11). */
export const UPDATE_COLLECTION_FAILURE_MESSAGES: Readonly<Record<Exclude<UpdateCollectionFailure, "unauthenticated">, string>> =
  {
    "too-many-saves": "Слишком много сохранений. Попробуйте через минуту.",
    "not-public": "Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.",
    unavailable: CREATE_COLLECTION_FAILURE_MESSAGES.unavailable,
    unknown: CREATE_COLLECTION_FAILURE_MESSAGES.unknown,
  };

/** The unsaved-changes dialog: the poem edit page's texts, copied (design D12). */
export const LEAVE_DIALOG_COPY = {
  title: "Есть несохранённые изменения",
  linkBody: "Сначала сохраните изменения.",
  signOutBody: "Если выйти сейчас, изменения пропадут.",
  stay: "Продолжить редактирование",
  leave: "Выйти без сохранения",
  close: COLLECTION_PAGE_COPY.close,
} as const;

/** Breadcrumb labels: the create page and the edit page's last item (FR-17). */
export const COLLECTION_TRAIL_LABELS = {
  newCollection: "Создание сборника",
  editCollection: "Редактирование",
} as const;
