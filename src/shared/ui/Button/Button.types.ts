import type { ComponentPropsWithRef } from "react";

export type ButtonVariant = "primary" | "ghost" | "danger";

/** The native button's props, `ref` included (a plain prop in React 19). */
export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
}
