export interface BreadcrumbsProps {
  /** The page's URL segments, from its slot page; awaited inside the Suspense boundary. */
  readonly segments: Promise<readonly string[]>;
}
