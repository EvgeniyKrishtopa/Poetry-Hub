import "server-only";

import type { PoemGenreName, PoemGenresResult } from "../model/poem.types";

/** The project's Contentful `tag` entries, sorted by Russian name; kept hours on success, seconds on failure (design D5). */
export async function listPoemGenres(): Promise<PoemGenresResult> {
  throw new Error("not implemented");
}

/** The genre line of a poem page: `none` for no id, an unknown id, or an unavailable list (design D5). */
export async function getPoemGenreName(genreId: string | null): Promise<PoemGenreName> {
  void genreId;
  throw new Error("not implemented");
}
