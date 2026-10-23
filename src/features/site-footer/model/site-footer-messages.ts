import type { FOOTER_LINK_PATHS } from "./site-footer.constants";

// Every string of the proposal's UI copy table, verbatim and in Russian.

export const FOOTER_LINK_LABELS: Readonly<Record<keyof typeof FOOTER_LINK_PATHS, string>> = {
  about: "О проекте",
  privacy: "Политика конфиденциальности",
};

/** Accessible name of the footer's navigation landmark. */
export const FOOTER_NAV_LABEL = "Информация о проекте";

export const COPYRIGHT_SIGN = "©";
