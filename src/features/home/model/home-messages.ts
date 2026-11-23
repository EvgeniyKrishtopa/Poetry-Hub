// The home page's own copy. The about text, the headings and the closing invitation are placeholders the owner
// confirms (proposal.md, Open Questions); they are props-free constants, so a Contentful source can replace
// them later without touching the components (design D7).

export const HERO_COPY = {
  readWorks: "Читать произведения",
  becomeAuthor: "Стать автором",
} as const;

export const SECTION_HEADINGS = {
  featuredWorks: "Избранные произведения",
  authors: "Авторы проекта",
  latestWorks: "Последние публикации",
} as const;

export const ABOUT_COPY = {
  heading: "О проекте",
  text: "Поэтический Хаб — место, где поэзия находит читателя. Мы собираем стихи современных авторов, чтобы их было удобно читать, сохранять и обсуждать. Здесь ценят живое слово, уважение к автору и внимательное чтение.",
  link: "Подробнее о проекте",
} as const;

export const JOIN_COPY = {
  heading: "Станьте частью Поэтического Хаба",
  text: "Публикуйте свои стихи, находите читателей и собирайте произведения в сборники.",
  button: "Присоединиться к проекту",
} as const;

/** The accessible name of a work card's link: the title, then the author (FR-2, NFR-5). */
export function formatWorkLinkName(title: string, authorName: string): string {
  return `${title}, ${authorName}`;
}
