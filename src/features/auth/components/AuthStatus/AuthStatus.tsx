import Link from "next/link";

import { RUSSIAN_LANG } from "@/shared/config/constants";

import { ACCOUNT_PATH } from "../../model/auth.constants";
import { ACCOUNT_LINK_LABEL } from "../../model/auth-messages";
import { SignOutButton } from "../SignOutButton/SignOutButton";

import type { AuthStatusProps } from "./AuthStatus.types";

/**
 * The header's session part. The layout reads the session on the server and passes only
 * whether the reader is signed in (design D2, D3).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function AuthStatus({ signedIn }: AuthStatusProps) {
  if (signedIn) {
    return (
      <div className="flex items-center gap-4">
        <Link lang={RUSSIAN_LANG} href={ACCOUNT_PATH} className="text-sm font-medium text-foreground hover:text-accent">
          {ACCOUNT_LINK_LABEL}
        </Link>
        <SignOutButton />
      </div>
    );
  }

  return (
    <Link href="/login" className="text-sm font-medium text-accent">
      Sign in
    </Link>
  );
}
