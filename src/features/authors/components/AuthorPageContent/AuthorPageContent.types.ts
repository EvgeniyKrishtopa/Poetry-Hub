import type { AuthorPageProps } from "../AuthorPage/AuthorPage.types";

export interface AuthorPageContentProps extends Pick<AuthorPageProps, "poems" | "renderModeration"> {
  /** The route's `id` param, still a promise: it is runtime data, awaited only inside the boundary. */
  readonly id: Promise<string>;
}
