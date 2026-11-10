import "server-only";

/**
 * Expires the author's public works tag after a write that already happened; a failure is only logged, never turned
 * into a failed write (public-collections D4). Callable only while a Server Action runs (`updateTag`'s own rule).
 */
export function expireAuthorWorksTag(authorId: string): void {
  void authorId;
  throw new Error("not implemented");
}
