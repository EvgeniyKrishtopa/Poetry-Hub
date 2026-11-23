import { Suspense } from "react";

import { AdminListSkeleton } from "../../components/AdminListSkeleton/AdminListSkeleton";
import { UserModerationPageContent } from "./UserModerationPageContent";

import type { UserModerationPageProps } from "./UserModerationPage.types";

/**
 * `/admin`: the gate and the list inside their own Suspense boundary (design D9, FR-2). The page reads the session
 * on every request, and under Cache Components such dynamic data must sit inside a boundary. The fallback is bare rows,
 * with no title: until the admin check answers, the page must not announce itself to a non-admin.
 */
export function UserModerationPage({ query }: UserModerationPageProps) {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <UserModerationPageContent query={query} />
    </Suspense>
  );
}
