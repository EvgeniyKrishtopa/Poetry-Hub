import Link from "next/link";

import { getSessionState } from "@/features/auth";
import { CONTENT_LANG, SESSION_STATE } from "@/shared/config/constants";

import { checkIsAdmin } from "../../dal/admin-check";
import { ADMIN_NAV_LABEL } from "../../model/admin-messages";
import { ADMIN_PATH } from "../../model/admin.constants";

/** The session is read first; `is_admin()` is asked only of a signed-in reader, so a guest costs no RPC (FR-20). */
export async function AdminNavLinkContent() {
  const { state } = await getSessionState();
  if (state !== SESSION_STATE.signedIn) return null;

  const admin = await checkIsAdmin();
  if (!admin.ok || !admin.isAdmin) return null;

  return (
    <Link lang={CONTENT_LANG} href={ADMIN_PATH} className="text-sm font-medium text-foreground hover:text-accent">
      {ADMIN_NAV_LABEL}
    </Link>
  );
}
