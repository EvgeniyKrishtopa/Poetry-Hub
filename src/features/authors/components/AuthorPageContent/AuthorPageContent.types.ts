export interface AuthorPageContentProps {
  /** The route's `id` param, still a promise: it is runtime data, awaited only inside the boundary. */
  readonly id: Promise<string>;
}
