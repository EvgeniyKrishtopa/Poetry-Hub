import type { NextRequest, NextResponse } from "next/server";

/**
 * Where Supabase Auth returns a Google sign-in. Only GET is exported, so Next answers 405 otherwise.
 * The target is one of a few fixed paths, never a request parameter (google-sign-in FR-G7, design D3, D5).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Reading the request marks the route dynamic, so the build does not prerender the stub and hit the throw.
  const { searchParams } = request.nextUrl;
  void searchParams;
  throw new Error("not implemented");
}
