/** One field of an error of unknown shape (Supabase's `AuthError`, a thrown value, anything), or `undefined`. */
export function readErrorProperty(error: unknown, key: "code" | "status" | "message"): unknown {
  return typeof error === "object" && error !== null && key in error
    ? (error as Record<typeof key, unknown>)[key]
    : undefined;
}
