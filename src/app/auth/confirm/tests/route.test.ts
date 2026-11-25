// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { confirmRecovery, confirmSignUp } from "@/features/auth";

import * as routeModule from "../route";
import { GET } from "../route";

// The real decision table runs here, so the tests check the redirects the spec names, not a stubbed target.
vi.mock("@/features/auth", async () => {
  const target = await vi.importActual<typeof import("@/features/auth/model/confirm-target")>(
    "@/features/auth/model/confirm-target",
  );
  return {
    CONFIRM_TYPE: target.CONFIRM_TYPE,
    getConfirmTarget: target.getConfirmTarget,
    confirmSignUp: vi.fn(),
    confirmRecovery: vi.fn(),
  };
});

const ORIGIN = "http://localhost:3000";
const CONFIRM_FAILED_LOCATION = `${ORIGIN}/login?error=confirm-failed`;
const RECOVERY_FAILED_LOCATION = `${ORIGIN}/login?error=recovery-failed`;

function get(query: string): NextRequest {
  return new NextRequest(`${ORIGIN}/auth/confirm${query}`);
}

describe("GET /auth/confirm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("an email link", () => {
    // implements FR-5 of add-supabase-auth
    it("redirects with 303 to / for a valid link", async () => {
      vi.mocked(confirmSignUp).mockResolvedValue("verified");

      const response = await GET(get("?token_hash=abc&type=email"));

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
      expect(confirmSignUp).toHaveBeenCalledWith("abc", "email");
      expect(confirmRecovery).not.toHaveBeenCalled();
    });

    it.each([
      ["no token_hash", "?type=email", null, "email"],
      ["a failed verification", "?token_hash=abc&type=email", "abc", "email"],
      ["an unknown type", "?token_hash=abc&type=magiclink", "abc", "magiclink"],
      ["no type", "?token_hash=abc", "abc", null],
    ])("redirects with 303 to /login?error=confirm-failed for %s", async (_label, query, tokenHash, type) => {
      vi.mocked(confirmSignUp).mockResolvedValue("failed");

      const response = await GET(get(query));

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(CONFIRM_FAILED_LOCATION);
      expect(confirmSignUp).toHaveBeenCalledWith(tokenHash, type);
      expect(confirmRecovery).not.toHaveBeenCalled();
    });
  });

  describe("a recovery link", () => {
    // implements FR-5 of auth (password-recovery)
    it("redirects with 303 to /reset-password for a valid link", async () => {
      vi.mocked(confirmRecovery).mockResolvedValue("verified");

      const response = await GET(get("?token_hash=abc&type=recovery"));

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/reset-password`);
      expect(confirmRecovery).toHaveBeenCalledWith("abc", "recovery");
      expect(confirmSignUp).not.toHaveBeenCalled();
    });

    it.each([
      ["no token_hash", "?type=recovery", null],
      ["a failed verification", "?token_hash=abc&type=recovery", "abc"],
    ])("redirects with 303 to /login?error=recovery-failed for %s", async (_label, query, tokenHash) => {
      vi.mocked(confirmRecovery).mockResolvedValue("failed");

      const response = await GET(get(query));

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(RECOVERY_FAILED_LOCATION);
      expect(confirmRecovery).toHaveBeenCalledWith(tokenHash, "recovery");
      expect(confirmSignUp).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["email", "/"],
    ["recovery", "/reset-password"],
  ] as const)("marks every outcome of a %s link private, no-store", async (type, successPath) => {
    vi.mocked(confirmSignUp).mockResolvedValueOnce("verified").mockResolvedValueOnce("failed");
    vi.mocked(confirmRecovery).mockResolvedValueOnce("verified").mockResolvedValueOnce("failed");

    const verified = await GET(get(`?token_hash=abc&type=${type}`));
    const failed = await GET(get(`?token_hash=abc&type=${type}`));

    expect(verified.headers.get("location")).toBe(`${ORIGIN}${successPath}`);
    expect(verified.headers.get("cache-control")).toBe("private, no-store");
    expect(failed.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([
    ["email", "/"],
    ["recovery", "/reset-password"],
  ] as const)("ignores a redirect-target parameter on a successful %s link", async (type, successPath) => {
    vi.mocked(confirmSignUp).mockResolvedValue("verified");
    vi.mocked(confirmRecovery).mockResolvedValue("verified");

    const response = await GET(get(`?token_hash=abc&type=${type}&next=https://evil.example`));

    expect(response.headers.get("location")).toBe(`${ORIGIN}${successPath}`);
  });

  it("exports only GET, so every other method answers 405", () => {
    expect(Object.keys(routeModule)).toEqual(["GET"]);
  });
});
