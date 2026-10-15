import Markdown from "react-markdown";

import { ABOUT_ALLOWED_ELEMENTS, ABOUT_COMPONENTS, ALIGN_CLASSES } from "./about-markdown";
import styles from "./AuthorAbout.module.css";
import type { AuthorAboutProps } from "./AuthorAbout.types";

/** About rendered from Markdown by an element allowlist, raw HTML skipped (NFR-1). */
export function AuthorAbout({ markdown, align }: AuthorAboutProps) {
  const alignment = align === "left" ? "" : styles.inlineLists;

  return (
    <div className={`${styles.about} ${alignment} ${ALIGN_CLASSES[align]}`}>
      {/* skipHtml drops raw HTML outright; unwrapDisallowed keeps a link's or heading's text. */}
      <Markdown skipHtml allowedElements={ABOUT_ALLOWED_ELEMENTS} unwrapDisallowed components={ABOUT_COMPONENTS}>
        {markdown}
      </Markdown>
    </div>
  );
}
