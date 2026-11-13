import { GripVertical } from "lucide-react";
import Link from "next/link";

import styles from "./BoardRow.module.css";
import type { BoardRowProps } from "./BoardRow.types";

/**
 * One item of the board: its drag handle (a `button`, the only element that starts a drag) and the title, which stays
 * a link to its page, so dragging is never the only way to it (NFR-4).
 */
export function BoardRow({
  variant,
  itemId,
  title,
  href,
  handleLabel,
  isLifted,
  handleDisabled,
  activatorRef,
  attributes,
  listeners,
}: BoardRowProps) {
  return (
    <div className={`${styles.row} ${isLifted ? styles.lifted : ""}`}>
      <button
        type="button"
        ref={activatorRef}
        data-handle={itemId}
        aria-label={handleLabel}
        disabled={handleDisabled}
        className={styles.handle}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <Link href={href} className={`${styles.title} ${variant === "collection" ? "text-lg" : "text-base leading-6"}`}>
        {title}
      </Link>
    </div>
  );
}
