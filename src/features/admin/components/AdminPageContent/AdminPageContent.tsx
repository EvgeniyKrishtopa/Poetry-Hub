import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireSession } from "@/features/auth";
import { SessionUnavailableAlert } from "@/shared/ui";

import { readAdminAccess } from "../../dal/admin-access";
import { ADMIN_LIST_COPY } from "../../model/admin-messages";
import { readListQuery } from "../../model/list-query";
import { AdminListSkeleton } from "../AdminListSkeleton/AdminListSkeleton";
import { AdminUserFilter } from "../AdminUserFilter/AdminUserFilter";
import { AdminUserList } from "../AdminUserList/AdminUserList";

import type { AdminPageContentProps } from "./AdminPageContent.types";

/**
 * The `/admin` gate, then the page: signed out goes to `/login`, an unreadable session or admin check shows the
 * outage state, a non-admin gets the not-found screen (design D9, FR-2). Title and filter appear only after the gate,
 * so a non-admin never sees them.
 */
export async function AdminPageContent({ query }: AdminPageContentProps) {
  const session = await requireSession();
  const access = await readAdminAccess(session.state);
  if (access === "unavailable") return <SessionUnavailableAlert />;
  if (access === "not-admin") notFound();

  const listQuery = readListQuery(await query);
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight">{ADMIN_LIST_COPY.title}</h1>
      <AdminUserFilter email={listQuery.email} />
      <Suspense fallback={<AdminListSkeleton />}>
        <AdminUserList query={listQuery} />
      </Suspense>
    </>
  );
}
