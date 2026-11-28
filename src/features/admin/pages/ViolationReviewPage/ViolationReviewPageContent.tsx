import { notFound, redirect } from "next/navigation";

import { requireSession } from "@/features/auth";
import { ADMIN_VERIFY_PATH } from "@/shared/config/account-paths";
import { Alert, SessionUnavailableAlert } from "@/shared/ui";

import { readAdminAccess } from "../../dal/admin-access";
import { listViolationCases } from "../../dal/violation-rpc";
import { VIOLATIONS_PAGE_COPY } from "../../model/admin-messages";
import { ViolationCaseRow } from "../../components/ViolationCaseRow/ViolationCaseRow";
import { ViolationsConnectionNotice } from "../../components/ViolationsConnectionNotice/ViolationsConnectionNotice";

/**
 * `/admin/violations`: the same gate as `UserModerationPageContent` (`requireSession`, `readAdminAccess`, `notFound()`),
 * never cached, then the open cases rendered on the server (design D7, FR-4, FR-5). The title appears only after the
 * gate, so a non-admin never sees it. The render time goes to the rows, which derive each status from it.
 */
export async function ViolationReviewPageContent() {
  const session = await requireSession();
  const access = await readAdminAccess(session);
  if (access === "unavailable") return <SessionUnavailableAlert />;
  if (access === "not-admin") notFound();
  if (access === "needs-second-factor") redirect(ADMIN_VERIFY_PATH);

  const result = await listViolationCases();
  // After the reads above: a clock read before request data is not allowed under Cache Components.
  const renderedAt = new Date().toISOString();

  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight">{VIOLATIONS_PAGE_COPY.title}</h1>
      {!result.ok && <Alert tone="danger">{VIOLATIONS_PAGE_COPY.loadFailed}</Alert>}
      {result.ok && result.cases.length === 0 && <p className="text-muted">{VIOLATIONS_PAGE_COPY.empty}</p>}
      {result.ok && result.cases.length > 0 && (
        <>
          <ViolationsConnectionNotice />
          <ul className="flex flex-col self-stretch border-b border-border">
            {result.cases.map((violationCase) => (
              <ViolationCaseRow key={violationCase.id} violationCase={violationCase} renderedAt={renderedAt} />
            ))}
          </ul>
          {result.capReached && <p className="text-muted">{VIOLATIONS_PAGE_COPY.capReached}</p>}
        </>
      )}
    </>
  );
}
