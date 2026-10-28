import type { Components } from "react-markdown";

import styles from "./MarkdownText.module.css";
import type { MarkdownTextVariant } from "./MarkdownText.types";

interface MarkdownVariant {
  /**
   * The only elements this variant may render (add-author-profiles NFR-1, add-poem-creation NFR-5).
   * `img` is allowed only so `components.img` can replace it with its alt text: unwrapping keeps an
   * element's children, and an image has none.
   */
  readonly allowedElements: readonly string[];
  readonly components: Components;
  readonly className: string;
}

/** An image renders as its alt text, never as an `img`. */
const renderImageAsAlt: Components["img"] = ({ alt }) => alt ?? null;

export const MARKDOWN_VARIANTS: Readonly<Record<MarkdownTextVariant, MarkdownVariant>> = {
  about: {
    allowedElements: ["p", "strong", "em", "h2", "h3", "ul", "ol", "li", "blockquote", "br", "img"],
    components: { img: renderImageAsAlt },
    className: styles.about,
  },
  poem: {
    // No headings, lists, or links: typed by hand, they show as their text.
    allowedElements: ["p", "strong", "em", "blockquote", "hr", "br", "img"],
    components: {
      img: renderImageAsAlt,
      blockquote: ({ children }) => <blockquote className={styles.epigraph}>{children}</blockquote>,
      hr: () => <hr className={styles.separator} />,
    },
    className: styles.poem,
  },
};
