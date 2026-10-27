import type { Components } from "react-markdown";

/**
 * The only elements about may render (NFR-1). `img` is allowed only so `components.img` can replace
 * it with its alt text: unwrapping keeps an element's children, and an image has none.
 */
export const ABOUT_ALLOWED_ELEMENTS = ["p", "strong", "em", "h2", "h3", "ul", "ol", "li", "blockquote", "br", "img"];

/** An image renders as its alt text, never as an `img` (NFR-1). */
export const ABOUT_COMPONENTS: Components = {
  img: ({ alt }) => alt ?? null,
};
