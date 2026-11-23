import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { Alert, SessionUnavailableAlert } from "@/shared/ui";

import { HomeConnectionNotice } from "../../components/HomeConnectionNotice/HomeConnectionNotice";
import { HomeEntryList } from "../../components/HomeEntryList/HomeEntryList";
import { readAdminAccess } from "../../dal/admin-access";
import { listHomeEntries } from "../../dal/home-rpc";
import { ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";

/**
 * `/admin/home`: the same gate as `ViolationReviewPageContent` (`requireSession`, `readAdminAccess`, `notFound()`),
 * never cached, then the two `HomeEntryList`s from `listHomeEntries` (FR-9, FR-11). The title appears only after the
 * gate, so a non-admin never sees it.
 */
export async function HomeCurationPageContent() {
  const session = await requireSession();
  const access = await readAdminAccess(session.state);
  if (access === "unavailable") return <SessionUnavailableAlert />;
  if (access === "not-admin") notFound();

  const result = await listHomeEntries();

  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight">{ADMIN_HOME_PAGE_COPY.title}</h1>
      {!result.ok && <Alert tone="danger">{ADMIN_HOME_PAGE_COPY.loadFailed}</Alert>}
      {result.ok && (
        <>
          <HomeConnectionNotice />
          <HomeEntryList kind="poem" entries={result.poems} />
          <HomeEntryList kind="author" entries={result.authors} />
        </>
      )}
    </>
  );
}
