import { Alert, ButtonLink } from "@/shared/ui";

import { listUsers } from "../../dal/user-list";
import { ADMIN_LIST_COPY } from "../../model/admin-messages";
import { parseListCursor } from "../../model/list-cursor";
import { adminListHref } from "../../model/list-href";
import { AdminUserRow } from "../AdminUserRow/AdminUserRow";

import type { AdminUserListProps } from "./AdminUserList.types";

/** One server-rendered page of rows and the page links (design D9, FR-3). A failed read keeps the page around it. */
export async function AdminUserList({ query }: AdminUserListProps) {
  const result = await listUsers(query);
  if (!result.ok) return <Alert tone="danger">{ADMIN_LIST_COPY.loadFailed}</Alert>;
  if (result.users.length === 0) return <p className="text-muted">{ADMIN_LIST_COPY.empty}</p>;

  const isFirstPage = parseListCursor(query.after) === null;
  return (
    <>
      <ul className="flex flex-col self-stretch border-b border-border">
        {result.users.map((user) => (
          <AdminUserRow key={user.id} user={user} />
        ))}
      </ul>
      {(result.nextCursor !== null || !isFirstPage) && (
        <div className="-ml-3 flex flex-wrap gap-2">
          {result.nextCursor !== null && (
            <ButtonLink variant="ghost" href={adminListHref({ after: result.nextCursor, email: query.email })}>
              {ADMIN_LIST_COPY.nextLink}
            </ButtonLink>
          )}
          {!isFirstPage && (
            <ButtonLink variant="ghost" href={adminListHref({ email: query.email })}>
              {ADMIN_LIST_COPY.firstPageLink}
            </ButtonLink>
          )}
        </div>
      )}
    </>
  );
}
