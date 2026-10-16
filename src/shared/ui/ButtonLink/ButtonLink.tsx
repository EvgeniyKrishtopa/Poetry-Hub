import Link from "next/link";

import styles from "../Button/Button.module.css";

import type { ButtonLinkProps } from "./ButtonLink.types";

/** A navigation link drawn as a `Button`: same variants and styles, but an `<a>`, never a `<button>`. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");

  return <Link className={classes} {...props} />;
}
