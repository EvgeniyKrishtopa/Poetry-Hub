// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import * as routeModule from "../route";

const { GET } = routeModule;

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const ORIGIN = "http://localhost:3000";
const CODE = "0b6c1f2e-9a7d-4c3b-8e5f-1a2b3c4d5e6f";
const CREATED_AT = "2026-11-24T10:00:00.000Z";
const JUST_AFTER_CREATION = "2026-11-24T10:00:00.053Z";
const DAYS_LATER = "2026-12-01T10:00:00.000Z";

/** The refusals Supabase put on the callback in task 1.2, as query strings. */
const CANCEL = "error=access_denied&error_description=";
const BANNED_SIGN_UP = "error=access_denied&error_code=&error_description=signup+not+allowed";
const BLOCKED_ACCOUNT = "error=access_denied&error_code=user_banned&error_description=User+is+banned";

const exchangeCodeForSession = vi.fn();

function exchangeSucceeds(lastSignInAt: string): void {
  const user = { id: "user-1", created_at: CREATED_AT, last_sign_in_at: lastSignInAt };
  exchangeCodeForSession.mockResolvedValue({ data: { user, session: { user } }, error: null });
}

function exchangeFails(code: string): void {
  exchangeCodeForSession.mockResolvedValue({
    data: { user: null, session: null },
    error: { name: "AuthApiError", code, status: 400, message: "failed" },
  });
}

function get(query: string): NextRequest {
  return new NextRequest(`${ORIGIN}/auth/callback?${query}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-G3 of google-sign-in
  it.each([
    ["a new account from /login", "from=sign-in", JUST_AFTER_CREATION, "/"],
    ["an existing account from /login", "from=sign-in", DAYS_LATER, "/"],
    ["a new account from /signup", "from=sign-up", JUST_AFTER_CREATION, "/"],
  ])("redirects with 303 to / after signing in %s", async (_label, from, lastSignInAt, target) => {
    exchangeSucceeds(lastSignInAt);

    const response = await GET(get(`code=${CODE}&${from}`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${target}`);
    expect(exchangeCodeForSession).toHaveBeenCalledWith(CODE);
  });

  // implements FR-G6 of google-sign-in
  it("redirects with 303 to the account-exists notice after a sign-up into an existing account", async () => {
    exchangeSucceeds(DAYS_LATER);

    const response = await GET(get(`code=${CODE}&from=sign-up`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/?auth-notice=account-exists`);
  });

  // implements FR-G4, FR-G5 of google-sign-in
  it.each([
    ["a cancel", CANCEL, "sign-up", "/signup?error=google-cancelled"],
    ["a cancel", CANCEL, "sign-in", "/login?error=google-cancelled"],
    ["the hook's refusal of a banned address", BANNED_SIGN_UP, "sign-up", "/signup?error=google-blocked"],
    ["a blocked account", BLOCKED_ACCOUNT, "sign-in", "/login?error=google-blocked"],
    ["an unknown refusal", "error=server_error", "sign-up", "/signup?error=google-failed"],
  ])("redirects with 303 after %s from %s to %s", async (_label, query, from, target) => {
    const response = await GET(get(`${query}&from=${from}`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${target}`);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  // implements FR-G5 of google-sign-in
  it("redirects to the blocked notice when the exchange reports a banned user", async () => {
    exchangeFails("user_banned");

    const response = await GET(get(`code=${CODE}&from=sign-in`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/login?error=google-blocked`);
  });

  // implements FR-G4 of google-sign-in
  it("redirects with 303 to the failed notice when the exchange returns an error that is not a block", async () => {
    exchangeFails("bad_code_verifier");

    const response = await GET(get(`code=${CODE}&from=sign-in`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/login?error=google-failed`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  // implements FR-G4 of google-sign-in
  it("redirects with 303 to the failed notice when the exchange throws", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("network down"));

    const response = await GET(get(`code=${CODE}&from=sign-up`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/signup?error=google-failed`);
  });

  // implements FR-G3 of google-sign-in
  it("redirects to the failed notice without exchanging when there is no code", async () => {
    const response = await GET(get("from=sign-up"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/signup?error=google-failed`);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it.each([
    ["a success", `code=${CODE}&from=sign-in`],
    ["a cancel", `${CANCEL}&from=sign-in`],
    ["a failure", "from=sign-in"],
    ["a blocked account", `${BLOCKED_ACCOUNT}&from=sign-in`],
  ])("marks the redirect after %s private, no-store", async (_label, query) => {
    exchangeSucceeds(DAYS_LATER);

    const response = await GET(get(query));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  // implements FR-G7 of google-sign-in
  it("ignores a redirect-target parameter", async () => {
    exchangeSucceeds(DAYS_LATER);

    const response = await GET(get(`code=${CODE}&from=sign-in&next=https://evil.example`));

    expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
  });

  // implements FR-G7 of google-sign-in
  it("treats an unknown origin as /login", async () => {
    const response = await GET(get(`${CANCEL}&from=https://evil.example`));

    expect(response.headers.get("location")).toBe(`${ORIGIN}/login?error=google-cancelled`);
  });

  it("exports only GET, so Next answers 405 to any other method", () => {
    expect(Object.keys(routeModule)).toEqual(["GET"]);
  });
});
