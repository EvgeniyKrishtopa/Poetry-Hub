import { notFound, redirect } from "next/navigation";

import { requireSession } from "@/features/auth";
import { ADMIN_PATH } from "@/shared/config/account-paths";
import { SessionUnavailableAlert } from "@/shared/ui";

import { TotpCodeForm } from "../../components/TotpCodeForm/TotpCodeForm";
import { TotpEnrolment } from "../../components/TotpEnrolment/TotpEnrolment";
import { readAdminAccess } from "../../dal/admin-access";
import { readTotpFactor } from "../../dal/totp";
import { ADMIN_VERIFY_COPY } from "../../model/admin-messages";

const TITLE_CLASS = "text-2xl font-semibold";

/**
 * The admin gate of `/admin/verify`, then code entry for an admin with a verified factor and enrolment for one without.
 * A verified session has nothing to do here and goes to `/admin`.
 */
export async function AdminVerifyPageContent() {
  const session = await requireSession();
  const access = await readAdminAccess(session);
  if (access === "unavailable") return <SessionUnavailableAlert />;
  if (access === "not-admin") notFound();
  if (access === "admin") redirect(ADMIN_PATH);

  const factor = await readTotpFactor();
  if (!factor.ok) return <SessionUnavailableAlert />;

  if (factor.status === "not-enrolled") {
    return (
      <>
        <h1 className={TITLE_CLASS}>{ADMIN_VERIFY_COPY.enrolTitle}</h1>
        <TotpEnrolment />
      </>
    );
  }

  return (
    <>
      <h1 className={TITLE_CLASS}>{ADMIN_VERIFY_COPY.codeTitle}</h1>
      <TotpCodeForm factorId={factor.factorId}>
        <p>{ADMIN_VERIFY_COPY.codeIntro}</p>
      </TotpCodeForm>
    </>
  );
}
