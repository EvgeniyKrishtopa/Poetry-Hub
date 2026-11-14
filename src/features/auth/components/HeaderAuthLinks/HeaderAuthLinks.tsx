import { Suspense } from "react";

import { HeaderAuthLinksContent } from "../HeaderAuthLinksContent/HeaderAuthLinksContent";
import { HeaderAuthPlaceholder } from "../HeaderAuthPlaceholder/HeaderAuthPlaceholder";

import type { HeaderAuthLinksProps } from "./HeaderAuthLinks.types";

/**
 * The header's auth links (Sign in, or the account link and Sign out). The session is read on the
 * server inside the Suspense boundary, so the rest of the header stays in the static shell. The
 * fallback keeps the header's width and shows neither link. `adminLink` is a slot the root layout
 * fills, shown between the account link and Sign out (admin-moderation design D13).
 */
export function HeaderAuthLinks({ adminLink }: HeaderAuthLinksProps = {}) {
  return (
    <Suspense fallback={<HeaderAuthPlaceholder />}>
      <HeaderAuthLinksContent adminLink={adminLink} />
    </Suspense>
  );
}
