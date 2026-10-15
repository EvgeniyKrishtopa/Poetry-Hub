import Link from "next/link";

import { SignOutButton } from "../SignOutButton/SignOutButton";

import type { AuthStatusProps } from "./AuthStatus.types";

/**
 * The header's session part. The layout reads the session on the server and passes only
 * whether the reader is signed in (design D2, D3).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function AuthStatus({ signedIn }: AuthStatusProps) {
  if (signedIn) return <SignOutButton />;

  return (
    <Link href="/login" className="text-sm font-medium text-accent">
      Sign in
    </Link>
  );
}
