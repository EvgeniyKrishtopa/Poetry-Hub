export interface AuthorPoemsPageContentProps {
  /** The route's `id` param, still a promise: it is runtime data, awaited only inside the boundary. */
  readonly authorId: Promise<string>;
}
