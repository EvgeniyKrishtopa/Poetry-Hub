export interface AuthorPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly id: Promise<string>;
}
