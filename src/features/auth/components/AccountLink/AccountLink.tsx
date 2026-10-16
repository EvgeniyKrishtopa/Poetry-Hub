import Link from "next/link";

import { CONTENT_LANG } from "@/shared/config/constants";

import { ACCOUNT_PATH } from "../../model/auth.constants";
import { ACCOUNT_LINK_LABEL } from "../../model/auth-messages";

/** The header's link to the signed-in reader's account page (add-author-profiles FR-3). */
export function AccountLink() {
  return (
    <Link lang={CONTENT_LANG} href={ACCOUNT_PATH} className="text-sm font-medium text-foreground hover:text-accent">
      {ACCOUNT_LINK_LABEL}
    </Link>
  );
}
