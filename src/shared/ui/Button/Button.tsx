import styles from "./Button.module.css";
import type { ButtonProps } from "./Button.types";

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...props} />;
}
