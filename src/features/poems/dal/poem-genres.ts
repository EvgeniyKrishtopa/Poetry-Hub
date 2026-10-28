import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { CONTENTFUL_CACHE_TAG, ContentfulError, contentfulQuery } from "@/shared/lib/contentful";

import { genreItemIdSchema, poetryGenreCollectionResponseSchema, poetryGenreSchema } from "../model/poem-genre.schema";
import type { PoemGenre, PoemGenreName, PoemGenresResult } from "../model/poem.types";

/** One page, a ceiling of 100 genres (design D5); the extra tags are neither offered nor named. */
const GENRES_LIMIT = 100;

const GENRES_SORT_LOCALE = "ru";

const POETRY_GENRES_QUERY = /* GraphQL */ `
  query GetPoetryGenres($limit: Int!) {
    tagCollection(limit: $limit) {
      total
      items {
        sys {
          id
        }
        name
        slug
      }
    }
  }
`;

const UNAVAILABLE: PoemGenresResult = { ok: false, reason: "unavailable" };
const NO_GENRE: PoemGenreName = { kind: "none" };

// Log lines carry the failure kind, counts, and a dropped entry's Contentful id only (NFR-10).

function failed(reason: string): PoemGenresResult {
  console.error(`[poems] list genres failed: ${reason}`);
  return UNAVAILABLE;
}

/** A valid item as a genre; an invalid one is dropped and logged by its id, when it has one. */
function toGenre(item: unknown): PoemGenre | null {
  const genre = poetryGenreSchema.safeParse(item);
  if (genre.success) return { id: genre.data.sys.id, name: genre.data.name };

  const id = genreItemIdSchema.safeParse(item);
  console.error("[poems] genre entry dropped: invalid", id.success ? { id: id.data.sys.id } : {});
  return null;
}

/** Reads, validates, and sorts the genres. Contentful failures become `unavailable`; other errors are rethrown. */
async function readPoemGenres(): Promise<PoemGenresResult> {
  let data: unknown;
  try {
    data = await contentfulQuery(POETRY_GENRES_QUERY, { limit: GENRES_LIMIT });
  } catch (error) {
    if (error instanceof ContentfulError) return failed(error.kind);
    throw error;
  }

  const parsed = poetryGenreCollectionResponseSchema.safeParse(data);
  if (!parsed.success) return failed("validation");

  const { total, items } = parsed.data.tagCollection;
  if (total > GENRES_LIMIT) console.warn("[poems] more genres than read", { total, limit: GENRES_LIMIT });

  const genres = items
    .map(toGenre)
    .filter((genre): genre is PoemGenre => genre !== null)
    .sort((a, b) => a.name.localeCompare(b.name, GENRES_SORT_LOCALE));
  return { ok: true, genres };
}

/** The project's Contentful `tag` entries, sorted by Russian name; kept hours on success, seconds on failure (design D5). */
export async function listPoemGenres(): Promise<PoemGenresResult> {
  "use cache";
  cacheTag(CONTENTFUL_CACHE_TAG);

  const result = await readPoemGenres();
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

/** The genre line of a poem page: `none` for no id, an unknown id, or an unavailable list (design D5). */
export async function getPoemGenreName(genreId: string | null): Promise<PoemGenreName> {
  if (genreId === null) return NO_GENRE;

  const result = await listPoemGenres();
  if (!result.ok) return NO_GENRE;

  const genre = result.genres.find((candidate) => candidate.id === genreId);
  return genre === undefined ? NO_GENRE : { kind: "named", name: genre.name };
}
