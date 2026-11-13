import "server-only";

/**
 * Expires the author's public works tag after a delete that already happened; a failure is only logged, never turned
 * into a failed delete. The feature's own copy of its siblings' helper: the features don't import each other.
 */
export function expireAuthorWorksTag(authorId: string): void {
  void authorId;
  throw new Error("not implemented");
}
