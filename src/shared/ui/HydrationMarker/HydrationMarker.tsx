"use client";

import { useEffect } from "react";

/**
 * Sets `data-hydrated="true"` on `<body>` once React has hydrated the document, so the recorded
 * Playwright scenarios wait for it before touching a form: a click before hydration lands on the
 * server HTML and submits nothing. A client-side navigation keeps the same `<body>`; a full reload
 * starts over. Renders nothing.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.body.dataset.hydrated = "true";
  }, []);
  return null;
}
