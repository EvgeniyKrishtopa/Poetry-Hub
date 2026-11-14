import { Suspense } from "react";

import { AdminListSkeleton } from "../AdminListSkeleton/AdminListSkeleton";
import { AdminPageContent } from "../AdminPageContent/AdminPageContent";

import type { AdminPageProps } from "./AdminPage.types";

/**
 * `/admin`: the gate and the list inside their own Suspense boundary (design D9, FR-2). The fallback is bare rows,
 * with no title: until the admin check answers, the page must not announce itself to a non-admin.
 */
export function AdminPage({ query }: AdminPageProps) {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <AdminPageContent query={query} />
    </Suspense>
  );
}
