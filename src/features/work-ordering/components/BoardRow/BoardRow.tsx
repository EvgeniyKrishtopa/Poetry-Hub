import Link from "next/link";

import styles from "./BoardRow.module.css";
import type { BoardRowProps } from "./BoardRow.types";

/** The handle's six dots (artboard 40). */
const GRIP_DOTS = [
  { x: 5.5, y: 3.5 },
  { x: 10.5, y: 3.5 },
  { x: 5.5, y: 8 },
  { x: 10.5, y: 8 },
  { x: 5.5, y: 12.5 },
  { x: 10.5, y: 12.5 },
] as const;
const GRIP_RADIUS = 1.5;

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
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={styles.dots}>
          {GRIP_DOTS.map(({ x, y }) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={GRIP_RADIUS} />
          ))}
        </svg>
      </button>
      <Link href={href} className={`${styles.title} ${variant === "collection" ? "text-lg" : "text-base leading-6"}`}>
        {title}
      </Link>
    </div>
  );
}
