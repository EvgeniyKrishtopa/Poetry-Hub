export interface BreadcrumbsLoaderProps {
  readonly segments: Promise<readonly string[]>;
}
