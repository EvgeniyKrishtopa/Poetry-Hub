import { type NextRequest, NextResponse } from "next/server";

import { CONFIRM_FAILED_ERROR, confirmSignUp } from "@/features/auth";

const HTTP_SEE_OTHER = 303;
const CONFIRMED_PATH = "/";
const CONFIRM_FAILED_PATH = `/login?error=${CONFIRM_FAILED_ERROR}`;
/** A success sets session cookies; neither outcome may be stored by a shared cache. */
const NO_SHARED_CACHE = "private, no-store";

/**
 * The sign-up email's confirmation link. Only GET is exported, so Next answers 405 otherwise.
 * Reads only `token_hash` and `type`; the target is one of two fixed paths, never a query
 * parameter, so there is no open redirect.
 */
// implements FR-5 of add-supabase-auth
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const result = await confirmSignUp(searchParams.get("token_hash"), searchParams.get("type"));
  const target = result === "confirmed" ? CONFIRMED_PATH : CONFIRM_FAILED_PATH;
  const response = NextResponse.redirect(new URL(target, request.url), HTTP_SEE_OTHER);
  response.headers.set("Cache-Control", NO_SHARED_CACHE);
  return response;
}
