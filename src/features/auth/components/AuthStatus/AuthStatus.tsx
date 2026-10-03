"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/shared/ui";

import { signOutAction } from "../../actions/auth.actions";
import { authKeys, sessionQueryOptions } from "../../api/auth.queries";
import { SIGN_OUT_FAILED_MESSAGE } from "../../model/auth-messages";

/**
 * Re-reads the session on every pathname change after the first render: sign-in redirects
 * and confirmation links are navigations, and Server Actions never notify the browser client.
 * Invalidation cancels a superseded read, so the latest read always wins (design D6).
 */
function useSessionRefreshOnNavigation(): void {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    void queryClient.invalidateQueries({ queryKey: authKeys.session() });
  }, [pathname, queryClient]);
}

/**
 * The header's session widget. Renders nothing user-specific on the server, so the root
 * layout stays identical for every reader and `/` keeps its rendering mode (design D5).
 */
// implements FR-7 of add-supabase-auth
// implements FR-8 of add-supabase-auth
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function AuthStatus() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: email, isPending } = useQuery(sessionQueryOptions);
  const [signingOut, startSignOut] = useTransition();
  const [signOutFailed, setSignOutFailed] = useState(false);
  useSessionRefreshOnNavigation();

  function signOut() {
    setSignOutFailed(false);
    startSignOut(async () => {
      let ok = false;
      try {
        ok = (await signOutAction()).data?.ok === true;
      } catch {
        // A failed call means the cookies may still exist: stay signed in and say so.
      }
      if (!ok) {
        setSignOutFailed(true);
        return;
      }
      // A read started before sign-out could land afterwards and restore the old email.
      await queryClient.cancelQueries({ queryKey: authKeys.session() });
      queryClient.setQueryData(authKeys.session(), null);
      router.refresh();
    });
  }

  if (isPending) return <div aria-hidden="true" className="min-w-24" />;

  if (!email) {
    return (
      <Link href="/login" className="text-sm font-medium text-accent">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {signOutFailed && (
        <p role="alert" className="font-medium text-accent">
          {SIGN_OUT_FAILED_MESSAGE}
        </p>
      )}
      <span className="text-muted">{email}</span>
      <Button variant="ghost" onClick={signOut} disabled={signingOut}>
        Sign out
      </Button>
    </div>
  );
}
