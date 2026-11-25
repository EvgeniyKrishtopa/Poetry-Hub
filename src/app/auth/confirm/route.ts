import { type NextRequest, NextResponse } from "next/server";

import { CONFIRM_TYPE, confirmRecovery, confirmSignUp, getConfirmTarget } from "@/features/auth";

const HTTP_SEE_OTHER = 303;
/** A success sets session cookies; no outcome may be stored by a shared cache. */
const NO_SHARED_CACHE = "private, no-store";

/**
 * The sign-up and the recovery emails' confirmation link. Only GET is exported, so Next answers 405 otherwise.
 * Reads only `token_hash` and `type`; the target comes from `getConfirmTarget`, one of a few fixed paths and never a
 * query parameter, so there is no open redirect. An unknown `type` goes to `confirmSignUp`, which refuses it
 * without calling Supabase.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const isRecoveryLink = type === CONFIRM_TYPE.recovery;
  const outcome = isRecoveryLink ? await confirmRecovery(tokenHash, type) : await confirmSignUp(tokenHash, type);
  const target = getConfirmTarget(type, outcome);
  const response = NextResponse.redirect(new URL(target, request.url), HTTP_SEE_OTHER);
  response.headers.set("Cache-Control", NO_SHARED_CACHE);
  return response;
}
