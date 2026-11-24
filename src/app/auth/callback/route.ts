import type { NextRequest, NextResponse } from "next/server";

/**
 * Where Supabase Auth returns a Google sign-in. Only GET is exported, so Next answers 405 otherwise.
 * The target is one of a few fixed paths, never a request parameter (google-sign-in FR-G7, design D3, D5).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  throw new Error("not implemented");
}
