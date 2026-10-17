import { Suspense } from "react";

import { HeaderAuthLinksContent } from "../HeaderAuthLinksContent/HeaderAuthLinksContent";
import { HeaderAuthPlaceholder } from "../HeaderAuthPlaceholder/HeaderAuthPlaceholder";

/**
 * The header's auth links (Sign in, or the account link and Sign out). The session is read on the
 * server inside the Suspense boundary, so the rest of the header stays in the static shell. The
 * fallback keeps the header's width and shows neither link.
 */
export function HeaderAuthLinks() {
  return (
    <Suspense fallback={<HeaderAuthPlaceholder />}>
      <HeaderAuthLinksContent />
    </Suspense>
  );
}
