import { Suspense } from "react";

import { SignedOutOnlyContent } from "./SignedOutOnlyContent";
import type { SignedOutOnlyProps } from "./SignedOutOnly.types";

/**
 * Renders its children to a visitor who is not signed in and to no one else (an admin is signed in too), in its
 * own boundary with an empty fallback: the session is read on the server outside any cache scope, and a signed-in
 * reader never receives the children, not even for a moment. The home page's closing invitation is built on it.
 */
export function SignedOutOnly({ children }: SignedOutOnlyProps) {
  return (
    <Suspense fallback={null}>
      <SignedOutOnlyContent>{children}</SignedOutOnlyContent>
    </Suspense>
  );
}
