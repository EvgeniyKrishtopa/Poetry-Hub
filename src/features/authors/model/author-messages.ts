import type { ImageFileError } from "@/shared/lib/image-file/image-file.types";

import type { ProfileField, WriteFailure } from "./author.types";

// Every string of the proposal's UI copy table, verbatim and in Russian (NFR-8). The Markdown editor's
// toolbar, tabs, and counter moved to `shared/ui/ui-messages.ts` with the editor (add-poem-creation D1).

export const PAGE_TITLES = {
  authors: "Наши авторы",
  account: "Мастерская поэта",
  authorEditor: "Профиль автора",
} as const;

/** The account page's author-section heading; the same words as the editor's title, but its own key. */
export const ACCOUNT_AUTHOR_SECTION_TITLE = "Профиль автора";

/** The entry to the author's poem management, on the account page and the own author page (add-poem-creation FR-1). */
const POEM_MANAGEMENT_LINK_LABEL = "Управление произведениями";

export const ACCOUNT_LINK_LABELS = {
  createProfile: "Создать кабинет автора",
  editProfile: "Редактировать профиль автора",
  openPublicPage: "Открыть публичную страницу",
  managePoems: POEM_MANAGEMENT_LINK_LABEL,
} as const;

export const FIELD_LABELS: Readonly<Record<ProfileField, string>> = {
  first_name: "Имя",
  last_name: "Фамилия",
  about: "О себе",
  photo: "Фото",
};

export const ADD_PROMPTS: Readonly<Record<ProfileField, string>> = {
  first_name: "Добавить имя",
  last_name: "Добавить фамилию",
  about: "Добавить «О себе»",
  photo: "Добавить фото",
};

export const FIELD_ACTION_LABELS = {
  edit: "Изменить",
  delete: "Удалить",
  save: "Сохранить",
  cancel: "Отмена",
  saving: "Сохранение…",
  deleting: "Удаление…",
} as const;

/** The photo picker's button; the native file input's own text follows the browser's language. */
export const PHOTO_PICKER_LABEL = "Выбрать фото";

export const SAVED_MESSAGE = "Сохранено";

export const VALIDATION_MESSAGES = {
  required: "Обязательное поле.",
  nameTooLong: "Не более 60 символов.",
  aboutTooLong: "Не более 1000 символов.",
  photoTooLarge: "Файл должен быть не больше 5 МБ.",
  photoUnsupportedType: "Допустимы только изображения PNG или JPEG.",
} as const;

/** The field error for a photo `validateImageFile` rejects, in the browser and in the action (FR-8). */
export const PHOTO_FILE_ERROR_MESSAGES: Readonly<Record<ImageFileError, string>> = {
  "too-large": VALIDATION_MESSAGES.photoTooLarge,
  "unsupported-type": VALIDATION_MESSAGES.photoUnsupportedType,
};

const FAILURE_MESSAGES: Readonly<Record<WriteFailure, string>> = {
  unauthenticated: "Сессия истекла. Войдите снова.",
  unavailable: "Сохранение сейчас недоступно. Попробуйте позже.",
  unknown: "Что-то пошло не так. Попробуйте ещё раз.",
  "too-many-saves": "Слишком много сохранений. Попробуйте через минуту.",
  "too-many-uploads": "Слишком много загрузок фото. Попробуйте через час.",
};

/** The message shown under a field for a failed read or write (FR-9, FR-21). */
export function getProfileFailureMessage(failure: WriteFailure): string {
  return FAILURE_MESSAGES[failure];
}

/** Shown instead of the account section or the editor when the own profile can't be read (FR-18). */
export const PROFILE_LOAD_FAILED_MESSAGE = "Не удалось загрузить профиль. Попробуйте позже.";

export const DIRECTORY_MESSAGES = {
  empty: "Пока нет авторов.",
  unavailable: "Список авторов сейчас недоступен.",
} as const;

/** The owner's links above the public author page's heading. */
export const OWNER_LINK_LABELS = {
  editProfile: "Редактировать профиль",
  managePoems: POEM_MANAGEMENT_LINK_LABEL,
} as const;

/** The photo's alt text: the "photo" prefix, then the first and last name (NFR-5). */
export function getPhotoAlt(fullName: string): string {
  return `Фото: ${fullName}`;
}
