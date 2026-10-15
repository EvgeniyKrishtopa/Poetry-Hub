import { Suspense } from "react";

import { HeaderSessionStatus } from "../HeaderSessionStatus/HeaderSessionStatus";

/**
 * The header's session part. The session is read on the server inside the Suspense boundary, so the
 * rest of the header stays in the static shell. The fallback keeps the header's width and shows
 * neither link.
 */
export function HeaderSession() {
  return (
    <Suspense fallback={<div aria-hidden="true" className="min-w-24" />}>
      <HeaderSessionStatus />
    </Suspense>
  );
}
