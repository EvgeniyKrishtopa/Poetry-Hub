import Link from "next/link";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { SESSION_STATE } from "@/shared/config/constants";

import { AccountLink } from "../AccountLink/AccountLink";
import { HeaderAuthPlaceholder } from "../HeaderAuthPlaceholder/HeaderAuthPlaceholder";
import { SignOutButton } from "../SignOutButton/SignOutButton";

import type { AuthStatusProps } from "./AuthStatus.types";

/**
 * The header's session part. The layout reads the session on the server and passes only its state
 * (design D2, D3). When the session can't be checked, neither link is shown: the page explains the
 * outage (add-author-profiles FR-20).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function AuthStatus({ session }: AuthStatusProps) {
  if (session === SESSION_STATE.unknown) return <HeaderAuthPlaceholder />;

  if (session === SESSION_STATE.signedIn) {
    return (
      <div className="flex items-center gap-4">
        <AccountLink />
        <SignOutButton />
      </div>
    );
  }

  return (
    <Link href={SIGN_IN_PATH} className="text-sm font-medium text-accent">
      Sign in
    </Link>
  );
}
