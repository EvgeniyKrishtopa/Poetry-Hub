export interface UserModerationPageProps {
  /** The page's raw URL parameters; `UserModerationPage` parses them with `listQuerySchema` inside its own Suspense boundary. */
  readonly query: Promise<Record<string, string | string[] | undefined>>;
}
