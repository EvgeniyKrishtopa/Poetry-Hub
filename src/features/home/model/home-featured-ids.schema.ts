import { z } from "zod";

import { lowercaseUuidSchema } from "@/features/poems";

import { FEATURED_LIMIT } from "./home.constants";
import type { HomeFeaturedIds } from "./home-section.types";

const idListSchema = z.array(lowercaseUuidSchema).max(FEATURED_LIMIT);

/** What `home_featured_ids()` answers: the two ordered id lists and nothing else (FR-2, FR-4). */
export const homeFeaturedIdsResponseSchema = z
  .object({
    poem_ids: idListSchema,
    author_ids: idListSchema,
  })
  .transform(
    (row): HomeFeaturedIds => ({
      poemIds: row.poem_ids,
      authorIds: row.author_ids,
    }),
  );
