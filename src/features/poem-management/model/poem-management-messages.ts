import { TEXT_MAX_LENGTH, TITLE_MAX_LENGTH } from "./poem-management.constants";

// Every string of the proposal's UI copy table this feature shows, verbatim and in Russian.

export const POEM_MANAGEMENT_COPY = {
  entryLink: "Управление произведениями",
  listHeading: "Ваши Произведения",
  addLink: "Добавить новое произведение",
  notPublic: "Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.",
  profileEditorLink: "Перейти к профилю автора",
  ownPoemsUnavailable: "Не удалось загрузить произведения. Попробуйте позже.",
  addHeading: "Добавление нового произведения",
  titleLabel: "Название произведения",
  textLabel: "Текст произведения",
  genreLabel: "Выберите жанр",
  genrePlaceholder: "—",
  noGenreOption: "Без жанра",
  illustrationLabel: "Иллюстрация (необязательно)",
  illustrationButton: "Выбрать иллюстрацию",
  removeIllustration: "Убрать иллюстрацию",
  submit: "Добавить произведение",
  submitPending: "Добавление…",
  genresUnavailable: "Список жанров сейчас недоступен. Попробуйте позже.",
  created: "Поздравляем, Ваше произведение успешно добавлено.",
} as const;

export const POEM_FIELD_ERRORS = {
  required: "Обязательное поле.",
  titleTooLong: `Не более ${TITLE_MAX_LENGTH} символов.`,
  textTooLong: `Не более ${TEXT_MAX_LENGTH} символов.`,
  genreUnavailable: "Этот жанр больше недоступен. Выберите другой.",
  illustrationTooLarge: "Файл должен быть не больше 5 МБ.",
  illustrationUnsupportedType: "Допустимы только изображения PNG или JPEG.",
} as const;

export const CREATE_POEM_FAILURE_MESSAGES = {
  "too-many-poems": "Слишком много новых произведений. Попробуйте позже.",
  unauthenticated: "Сессия истекла. Войдите снова.",
  unavailable: "Сохранение сейчас недоступно. Попробуйте позже.",
  unknown: "Что-то пошло не так. Попробуйте ещё раз.",
} as const;

/** Breadcrumb labels of the static management routes (design D10). */
export const POEM_MANAGEMENT_TRAIL_LABELS = {
  list: "Управление произведениями",
  newPoem: "Добавление нового произведения",
} as const;
