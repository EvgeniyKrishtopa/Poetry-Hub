import "server-only";

/** Whether the session can write, and why not when it can't. */
export type SessionCheck =
  { readonly ok: true } | { readonly ok: false; readonly failure: "unauthenticated" | "unavailable" };

/** The session step both actions share; the feature's own copy over `auth`'s public API. */
export async function checkSession(): Promise<SessionCheck> {
  throw new Error("not implemented");
}
