import styles from "./SectionHeading.module.css";
import type { SectionHeadingProps } from "./SectionHeading.types";

/** A section's `h2` in the serif display face (the page's one `h1` is the hero's). */
export function SectionHeading({ size = "regular", children }: SectionHeadingProps) {
  const classes = size === "large" ? `${styles.heading} ${styles.large}` : styles.heading;

  return <h2 className={classes}>{children}</h2>;
}
