import { Alert } from "@/shared/ui";

import { ACCOUNT_EXISTS_NOTICE } from "../../model/auth-messages";
import { AUTH_NOTICE } from "../../model/auth.constants";

import type { AuthNoticeProps } from "./AuthNotice.types";

/**
 * The home page's account-exists notice after a Google sign-up into an existing account, awaited inside its
 * own Suspense boundary with an empty fallback (google-sign-in FR-G6, design D6).
 */
export async function AuthNotice({ notice }: AuthNoticeProps) {
  const awaitedNotice = await notice;
  if (awaitedNotice !== AUTH_NOTICE.accountExists) return null;

  return (
    <div className="mx-auto w-full max-w-measure-text px-6 pt-6">
      <Alert tone="neutral">{ACCOUNT_EXISTS_NOTICE}</Alert>
    </div>
  );
}
