import { ABOUT_MAX_LENGTH } from "./author.constants";
import type { AboutAlign, MarkdownFormat, PhotoFileError, ProfileFailure, ProfileField } from "./author.types";

// Every string of the proposal's UI copy table, verbatim and in Russian (NFR-8).

export const PAGE_TITLES = {
  authors: "Наши авторы",
  account: "Мастерская поэта",
  authorEditor: "Профиль автора",
} as const;

/** The account page's author-section heading; the same words as the editor's title, but its own key. */
export const ACCOUNT_AUTHOR_SECTION_TITLE = "Профиль автора";

export const ACCOUNT_LINK_LABELS = {
  createProfile: "Создать кабинет автора",
  editProfile: "Редактировать профиль автора",
  openPublicPage: "Открыть публичную страницу",
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

export const FORMAT_LABELS: Readonly<Record<MarkdownFormat, string>> = {
  bold: "Жирный",
  italic: "Курсив",
  heading: "Заголовок",
  subheading: "Подзаголовок",
  bulleted: "Маркированный список",
  numbered: "Нумерованный список",
  quote: "Цитата",
};

export const ALIGN_LABELS: Readonly<Record<AboutAlign, string>> = {
  left: "По левому краю",
  center: "По центру",
  right: "По правому краю",
};

export const ABOUT_VIEW_LABELS = {
  editor: "Редактор",
  preview: "Просмотр",
} as const;

/** The word a toolbar format inserts, selected, when nothing is selected (design D7). */
export const FORMAT_PLACEHOLDER = "текст";

/** The about counter, e.g. "12 / 1000"; it may exceed the limit (FR-11). */
export function formatAboutCounter(length: number): string {
  return `${length} / ${ABOUT_MAX_LENGTH}`;
}

export const VALIDATION_MESSAGES = {
  required: "Обязательное поле.",
  nameTooLong: "Не более 60 символов.",
  aboutTooLong: "Не более 1000 символов.",
  photoTooLarge: "Файл должен быть не больше 5 МБ.",
  photoUnsupportedType: "Допустимы только изображения PNG или JPEG.",
  invalidAlign: "Недопустимое выравнивание.",
} as const;

/** The field error for a photo `validatePhotoFile` rejects, in the browser and in the action (FR-8). */
export const PHOTO_FILE_ERROR_MESSAGES: Readonly<Record<PhotoFileError, string>> = {
  "too-large": VALIDATION_MESSAGES.photoTooLarge,
  "unsupported-type": VALIDATION_MESSAGES.photoUnsupportedType,
};

const FAILURE_MESSAGES: Readonly<Record<ProfileFailure, string>> = {
  unauthenticated: "Сессия истекла. Войдите снова.",
  unavailable: "Сохранение сейчас недоступно. Попробуйте позже.",
  unknown: "Что-то пошло не так. Попробуйте ещё раз.",
};

/** The message shown under a field for a failed read or write (FR-9). */
export function getProfileFailureMessage(failure: ProfileFailure): string {
  return FAILURE_MESSAGES[failure];
}

/** Shown on the account pages when the session itself can't be checked: Supabase is down (FR-20). */
export const SESSION_UNAVAILABLE_MESSAGE = "Сервис временно недоступен. Попробуйте позже.";

export const RETRY_LABEL = "Повторить";

/** Shown instead of the account section or the editor when the own profile can't be read (FR-18). */
export const PROFILE_LOAD_FAILED_MESSAGE = "Не удалось загрузить профиль. Попробуйте позже.";

export const DIRECTORY_MESSAGES = {
  empty: "Пока нет авторов.",
  unavailable: "Список авторов сейчас недоступен.",
} as const;

export const OWNER_EDIT_LINK_LABEL = "Редактировать профиль";

/** The photo's alt text: the "photo" prefix, then the first and last name (NFR-5). */
export function getPhotoAlt(fullName: string): string {
  return `Фото: ${fullName}`;
}
