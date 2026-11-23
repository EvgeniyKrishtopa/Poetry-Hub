import { Suspense } from "react";

import { AddToHomeControlContent } from "./AddToHomeControlContent";
import type { AddToHomeControlProps } from "./AddToHomeControl.types";

/** The show-on-the-home-page control in its own Suspense boundary with an empty fallback; nothing for anyone but an admin. */
export function AddToHomeControl(props: AddToHomeControlProps) {
  return (
    <Suspense fallback={null}>
      <AddToHomeControlContent {...props} />
    </Suspense>
  );
}
