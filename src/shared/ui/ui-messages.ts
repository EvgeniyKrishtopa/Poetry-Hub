import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

// The shared primitives' own copy, verbatim and in Russian (add-author-profiles and add-poem-creation NFR-8).

/** The Markdown editor's toolbar buttons; each editor shows only its own `formats`. */
export const MARKDOWN_FORMAT_LABELS: Readonly<Record<MarkdownFormat, string>> = {
  bold: "Жирный",
  italic: "Курсив",
  heading: "Заголовок",
  subheading: "Подзаголовок",
  bulleted: "Маркированный список",
  numbered: "Нумерованный список",
  quote: "Цитата",
  epigraph: "Эпиграф",
  separator: "Разделитель частей",
  indent: "Отступ",
};

export const MARKDOWN_VIEW_LABELS = {
  editor: "Редактор",
  preview: "Просмотр",
} as const;

/** A text field's counter, e.g. "12 / 1000"; it may exceed the limit. */
export function formatCharacterCounter(length: number, maxLength: number): string {
  return `${length} / ${maxLength}`;
}
