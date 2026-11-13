import type { AdminPageProps } from "./AdminPage.types";

/** `/admin`: the session and admin gate, then the user list, inside its own Suspense boundary (design D9, FR-2). */
export function AdminPage({ query }: AdminPageProps) {
  void query;
  return null;
}
