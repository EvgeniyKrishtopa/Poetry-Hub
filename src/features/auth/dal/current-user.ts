import "server-only";

/**
 * The signed-in user's id from the session claims, or `null`. The one place that decides
 * "who is signed in". Never throws.
 */
export async function getCurrentUserId(): Promise<string | null> {
  throw new Error("not implemented");
}

/** The signed-in user's id; redirects to `/login` when there is none. */
export async function requireUserId(): Promise<string> {
  throw new Error("not implemented");
}
