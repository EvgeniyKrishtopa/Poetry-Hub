import { getPoemGenreName } from "../../dal/poem-genres";
import { PoemView } from "../PoemView/PoemView";

import type { PoemArticleProps } from "./PoemArticle.types";

/**
 * Reads the poem's genre name from the current Contentful list and renders `PoemView`; shared by the
 * public and the owner's poem page, so both show the same article (design D1, D4).
 */
export async function PoemArticle({ poem }: PoemArticleProps) {
  return <PoemView poem={poem} genre={await getPoemGenreName(poem.genreId)} />;
}
