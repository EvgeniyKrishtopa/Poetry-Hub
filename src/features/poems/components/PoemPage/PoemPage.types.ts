export interface PoemPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly authorId: Promise<string>;
  /** The route's `poemId` param, awaited inside the Suspense boundary. */
  readonly poemId: Promise<string>;
}
