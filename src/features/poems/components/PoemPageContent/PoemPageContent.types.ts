export interface PoemPageContentProps {
  /** The route's `id` param, awaited only inside the boundary. */
  readonly authorId: Promise<string>;
  /** The route's `poemId` param, awaited only inside the boundary. */
  readonly poemId: Promise<string>;
}
