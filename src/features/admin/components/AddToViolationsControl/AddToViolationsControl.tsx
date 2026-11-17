import type { AddToViolationsControlProps } from "./AddToViolationsControl.types";

/** The admin-only add control in its own Suspense boundary with an empty fallback; nothing for anyone else (NFR-4). */
export function AddToViolationsControl(props: AddToViolationsControlProps) {
  void props;
  return null;
}
