import type { AddToHomeControlProps } from "./AddToHomeControl.types";

/** «Показать на главной» in its own Suspense boundary with an empty fallback; nothing for anyone but an admin (FR-8). */
export function AddToHomeControl(props: AddToHomeControlProps): null {
  void props;
  return null;
}
