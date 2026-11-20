import { CONTENT_PAGE_KEYS } from "./content-page.constants";
import type { ContentPageKey } from "./content-page.types";

// The content-page feature's own UI strings; the page's title and text come from Contentful.

/** Each content page's meta description: one fixed sentence per page, none shared (seo-metadata FR-2). */
export const CONTENT_PAGE_DESCRIPTIONS: Readonly<Record<ContentPageKey, string>> = {
  [CONTENT_PAGE_KEYS.about]: "Что такое Поэтический Хаб и зачем он нужен: рассказ о проекте.",
  [CONTENT_PAGE_KEYS.privacyPolicy]:
    "Политика конфиденциальности Поэтического Хаба: какие данные мы собираем и как ими распоряжаемся.",
};

/** Announced by the loading placeholder's status region; visually hidden. */
export const CONTENT_PAGE_LOADING_LABEL = "Загрузка…";
