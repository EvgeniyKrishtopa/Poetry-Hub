// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { confirmSignUp } from "@/features/auth";

import { GET } from "../route";

vi.mock("@/features/auth", () => ({
  CONFIRM_FAILED_ERROR: "confirm-failed",
  confirmSignUp: vi.fn(),
}));

const ORIGIN = "http://localhost:3000";

function get(query: string): NextRequest {
  return new NextRequest(`${ORIGIN}/auth/confirm${query}`);
}

describe("GET /auth/confirm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-5 of add-supabase-auth
  it("redirects with 303 to / for a valid link", async () => {
    vi.mocked(confirmSignUp).mockResolvedValue("confirmed");

    const response = await GET(get("?token_hash=abc&type=email"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
    expect(confirmSignUp).toHaveBeenCalledWith("abc", "email");
  });

  it.each([["confirmed"], ["failed"]] as const)("marks the %s redirect private, no-store", async (result) => {
    vi.mocked(confirmSignUp).mockResolvedValue(result);

    const response = await GET(get("?token_hash=abc&type=email"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([
    ["no token_hash", "?type=email", null, "email"],
    ["type=recovery", "?token_hash=abc&type=recovery", "abc", "recovery"],
    ["a failed verification", "?token_hash=abc&type=email", "abc", "email"],
  ])("redirects with 303 to /login?error=confirm-failed for %s", async (_label, query, tokenHash, type) => {
    vi.mocked(confirmSignUp).mockResolvedValue("failed");

    const response = await GET(get(query));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/login?error=confirm-failed`);
    expect(confirmSignUp).toHaveBeenCalledWith(tokenHash, type);
  });

  it("ignores a redirect-target parameter", async () => {
    vi.mocked(confirmSignUp).mockResolvedValue("confirmed");

    const response = await GET(get("?token_hash=abc&type=email&next=https://evil.example"));

    expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
  });
});
