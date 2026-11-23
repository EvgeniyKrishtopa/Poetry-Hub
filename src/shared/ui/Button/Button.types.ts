import type { ComponentPropsWithRef } from "react";

/** `onImage` is the white outline for a button over a photo (the home hero); it is never used on a plain page. */
export type ButtonVariant = "primary" | "ghost" | "danger" | "onImage";

/** `lg` is the 16/24 hero and call-to-action size; `md` is the size every other button uses. */
export type ButtonSize = "md" | "lg";

/** The native button's props, `ref` included (a plain prop in React 19). */
export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
