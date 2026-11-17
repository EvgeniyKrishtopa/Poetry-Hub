import Link from "next/link";

import { ADMIN_PATH } from "@/shared/config/account-paths";
import { CONTENT_LANG } from "@/shared/config/constants";

import { ADMIN_NAV_LABEL } from "../../model/admin-messages";
import { AdminOnly } from "../AdminOnly/AdminOnly";

/** The header link to `/admin`, shown to an admin only (design D13, D14). */
export function AdminNavLink() {
  return (
    <AdminOnly>
      <Link lang={CONTENT_LANG} href={ADMIN_PATH} className="text-sm font-medium text-foreground hover:text-accent">
        {ADMIN_NAV_LABEL}
      </Link>
    </AdminOnly>
  );
}
