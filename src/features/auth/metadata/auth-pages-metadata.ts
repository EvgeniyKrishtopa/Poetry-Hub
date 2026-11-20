import "server-only";

import type { Metadata } from "next";

/** `/login`: a title, a canonical and `noindex, follow`; no description and no card (FR-7). */
export function getLoginPageMetadata(): Metadata {
  throw new Error("not implemented");
}

/** `/signup`: the same shape as the login page (FR-7). */
export function getSignupPageMetadata(): Metadata {
  throw new Error("not implemented");
}
