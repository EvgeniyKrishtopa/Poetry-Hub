import type { ProfileRow } from "./author-profile.schema";

/** A row with every content field empty reads as "no profile" (design D3). */
export function hasProfileContent(row: ProfileRow): boolean {
  return [row.first_name, row.last_name, row.about, row.photo_path].some((value) => value !== null);
}
