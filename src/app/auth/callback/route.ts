import { type NextRequest, NextResponse } from "next/server";

import { finishGoogleSignIn, getGoogleCallbackTarget, GOOGLE_FLOW_PARAM } from "@/features/auth";

const HTTP_SEE_OTHER = 303;
/** A success sets session cookies; no outcome may be stored by a shared cache. */
const NO_SHARED_CACHE = "private, no-store";
/** The search parameters Supabase Auth puts on the callback address. */
const SUPABASE_PARAM = {
  code: "code",
  error: "error",
  errorCode: "error_code",
  errorDescription: "error_description",
} as const;

/**
 * Where Supabase Auth returns a Google sign-in. Only GET is exported, so Next answers 405 otherwise.
 * The target is one of a few fixed paths, never a request parameter (google-sign-in FR-G7, design D3, D5).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const result = await finishGoogleSignIn({
    code: searchParams.get(SUPABASE_PARAM.code),
    error: searchParams.get(SUPABASE_PARAM.error),
    errorCode: searchParams.get(SUPABASE_PARAM.errorCode),
    errorDescription: searchParams.get(SUPABASE_PARAM.errorDescription),
  });
  const from = searchParams.get(GOOGLE_FLOW_PARAM);
  const target = getGoogleCallbackTarget(result, from);
  const response = NextResponse.redirect(new URL(target, request.url), HTTP_SEE_OTHER);
  response.headers.set("Cache-Control", NO_SHARED_CACHE);
  return response;
}
