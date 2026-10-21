// The breadcrumb strings this feature owns, verbatim from the change's UI copy table (NFR-6). The authors
// pages' titles come from `AUTHORS_PAGE_TITLES`.

export const BREADCRUMBS_LANDMARK_LABEL = "Навигационная цепочка";

export const BREADCRUMB_LABELS = {
  home: "Главная",
  signIn: "Вход",
  signUp: "Регистрация",
  about: "О проекте",
  authorFallback: "Автор",
} as const;

/** Decorative; hidden from assistive technology. */
export const BREADCRUMB_SEPARATOR = "›";
