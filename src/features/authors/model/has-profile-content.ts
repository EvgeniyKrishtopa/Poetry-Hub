import type { ProfileRow } from "./author-profile.schema";

/** A row with every content field empty reads as "no profile" (design D3). */
export function hasProfileContent(row: ProfileRow): boolean {
  void row;
  throw new Error("not implemented");
}
