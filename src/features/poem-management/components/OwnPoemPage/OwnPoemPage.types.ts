export interface OwnPoemPageProps {
  /** The route's `poemId` param, awaited inside the Suspense boundary. */
  readonly poemId: Promise<string>;
}
