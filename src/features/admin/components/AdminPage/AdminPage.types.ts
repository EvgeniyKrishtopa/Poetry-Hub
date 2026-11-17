export interface AdminPageProps {
  /** The page's raw URL parameters; `AdminPage` parses them with `listQuerySchema` inside its own Suspense boundary. */
  readonly query: Promise<Record<string, string | string[] | undefined>>;
}
