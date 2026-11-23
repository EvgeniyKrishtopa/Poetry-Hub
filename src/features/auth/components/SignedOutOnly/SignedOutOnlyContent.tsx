import { SESSION_STATE } from "@/shared/config/constants";

import { getSessionState } from "../../dal/current-user";

import type { SignedOutOnlyProps } from "./SignedOutOnly.types";

/** Children only for a session check that found nobody signed in; signed in and unknown both show nothing. */
export async function SignedOutOnlyContent({ children }: SignedOutOnlyProps) {
  const { state } = await getSessionState();
  if (state !== SESSION_STATE.signedOut) return null;

  return children;
}
