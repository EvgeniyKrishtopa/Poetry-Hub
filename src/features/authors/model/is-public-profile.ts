import type { AuthorProfile } from "./author.types";

/** A profile is public exactly when both names are set (FR-4); the RLS policy mirrors this. */
export function isPublicProfile(profile: Pick<AuthorProfile, "firstName" | "lastName">): boolean {
  void profile;
  throw new Error("not implemented");
}
