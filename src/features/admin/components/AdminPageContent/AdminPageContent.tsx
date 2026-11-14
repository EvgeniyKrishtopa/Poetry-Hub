import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";
import { SessionUnavailableAlert } from "@/shared/ui";

import { checkIsAdmin } from "../../dal/admin-check";
import { ADMIN_LIST_COPY } from "../../model/admin-messages";
import { readListQuery } from "../../model/list-query";
import { AdminListSkeleton } from "../AdminListSkeleton/AdminListSkeleton";
import { AdminUserFilter } from "../AdminUserFilter/AdminUserFilter";
import { AdminUserList } from "../AdminUserList/AdminUserList";

import type { AdminPageContentProps } from "./AdminPageContent.types";
import { Suspense } from "react";

/**
 * The `/admin` gate, then the page: signed out goes to `/login`, an unreadable session or admin check shows the
 * outage state, a non-admin gets the not-found screen (design D9, FR-2). Title and filter appear only after the gate,
 * so a non-admin never sees them.
 */
export async function AdminPageContent({ query }: AdminPageContentProps) {
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const admin = await checkIsAdmin();
  if (!admin.ok) return <SessionUnavailableAlert />;
  if (!admin.isAdmin) notFound();

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
