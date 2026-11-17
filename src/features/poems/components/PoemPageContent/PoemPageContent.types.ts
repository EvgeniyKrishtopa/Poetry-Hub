import type { PoemPageProps } from "../PoemPage/PoemPage.types";

export interface PoemPageContentProps extends Pick<PoemPageProps, "renderModeration"> {
  /** The route's `id` param, awaited only inside the boundary. */
  readonly authorId: Promise<string>;
  /** The route's `poemId` param, awaited only inside the boundary. */
  readonly poemId: Promise<string>;
}
