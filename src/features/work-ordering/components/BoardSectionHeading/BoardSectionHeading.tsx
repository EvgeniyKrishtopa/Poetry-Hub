import { WORK_BOARD_COPY } from "../../model/work-ordering-messages";

import styles from "./BoardSectionHeading.module.css";
import type { BoardSectionHeadingProps } from "./BoardSectionHeading.types";

/** The board's section heading, 24/32 px semibold with the tight tracking of the page's other section headings. */
export function BoardSectionHeading({ id }: BoardSectionHeadingProps) {
  return (
    <h2 id={id} className={`${styles.heading} text-2xl font-semibold`}>
      {WORK_BOARD_COPY.sectionHeading}
    </h2>
  );
}
