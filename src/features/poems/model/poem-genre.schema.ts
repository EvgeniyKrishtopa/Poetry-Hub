import { z } from "zod";

const nonBlankString = z.string().trim().min(1);

/** One Contentful `tag` entry (`PoetryGenre`, design D5). `slug` is checked but not used yet. */
export const poetryGenreSchema = z.object({
  sys: z.object({ id: nonBlankString }),
  name: nonBlankString,
  slug: nonBlankString,
});

/**
 * The `tagCollection` envelope. Items stay unknown here, so one bad entry is dropped on its own
 * instead of failing the whole list.
 */
export const poetryGenreCollectionResponseSchema = z.object({
  tagCollection: z.object({
    total: z.number().int().nonnegative(),
    items: z.array(z.unknown()),
  }),
});

/** Reads an item's `sys.id` for the drop log, when it has one. */
export const genreItemIdSchema = z.object({ sys: z.object({ id: z.string() }) });
