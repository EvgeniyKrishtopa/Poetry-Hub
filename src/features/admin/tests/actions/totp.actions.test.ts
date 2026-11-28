// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { startTotpEnrolmentAction } from "../../actions/start-totp-enrolment.actions";
import { verifyTotpCodeAction } from "../../actions/verify-totp-code.actions";
import { checkIsAdmin } from "../../dal/admin-check";
import { startTotpEnrolment, verifyTotpCode } from "../../dal/totp";
import { consumeTotpVerifyAllowance } from "../../dal/totp-verify-allowance";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${path};307;` });
  }),
);
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect,
}));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));
vi.mock("../../dal/totp", () => ({ startTotpEnrolment: vi.fn(), verifyTotpCode: vi.fn() }));
vi.mock("../../dal/totp-verify-allowance", () => ({ consumeTotpVerifyAllowance: vi.fn() }));

const PASSWORD_ONLY = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal1", amr: [] } as const;
const INPUT = { factorId: "5b1f0a52-3a39-4d0e-9f0c-2f0a3b6c9d11", code: "123456" };

function asAdminWithoutTheFactor() {
  vi.mocked(getSessionState).mockResolvedValue(PASSWORD_ONLY);
  vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });
}

/** The path the action redirected to; `next-safe-action` rethrows Next's redirect error. */
async function redirectedTo(call: () => Promise<unknown>): Promise<string | undefined> {
  await expect(call()).rejects.toThrow("NEXT_REDIRECT");
  return redirect.mock.calls[0]?.[0];
}

beforeEach(() => {
  asAdminWithoutTheFactor();
  vi.mocked(consumeTotpVerifyAllowance).mockResolvedValue("allowed");
  vi.mocked(verifyTotpCode).mockResolvedValue({ ok: true });
});

afterEach(() => vi.clearAllMocks());

describe("verifyTotpCodeAction", () => {
  // implements FR-7, FR-8 of pre-deploy-security-hardening: correct code
  it("counts the attempt, verifies and redirects to /admin", async () => {
    expect(await redirectedTo(() => verifyTotpCodeAction(INPUT))).toBe("/admin");

    expect(verifyTotpCode).toHaveBeenCalledExactlyOnceWith(INPUT.factorId, INPUT.code);
    expect(vi.mocked(consumeTotpVerifyAllowance).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(verifyTotpCode).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-7 of pre-deploy-security-hardening: wrong code
  it("answers wrong-code without redirecting", async () => {
    vi.mocked(verifyTotpCode).mockResolvedValue({ ok: false, failure: "wrong-code" });

    const result = await verifyTotpCodeAction(INPUT);

    expect(result.data).toEqual({ ok: false, failure: "wrong-code" });
    expect(redirect).not.toHaveBeenCalled();
  });

  // implements FR-7 of pre-deploy-security-hardening: too many codes
  it.each([
    ["refused", "limited"],
    ["failed", "unavailable"],
  ] as const)("asks Supabase nothing when the allowance is %s", async (allowance, failure) => {
    vi.mocked(consumeTotpVerifyAllowance).mockResolvedValue(allowance);

    const result = await verifyTotpCodeAction(INPUT);

    expect(result.data).toEqual({ ok: false, failure });
    expect(verifyTotpCode).not.toHaveBeenCalled();
  });

  it.each([
    ["too short a code", { ...INPUT, code: "12345" }],
    ["letters", { ...INPUT, code: "abcdef" }],
    ["a factor id that is not one", { ...INPUT, factorId: "factor" }],
  ])("refuses %s before it counts an attempt", async (_case, input) => {
    const result = await verifyTotpCodeAction(input);

    expect(result.validationErrors).toBeDefined();
    expect(consumeTotpVerifyAllowance).not.toHaveBeenCalled();
  });

  // implements FR-7 of pre-deploy-security-hardening: not an admin
  it("counts and verifies nothing for a reader who is not an admin", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: false });

    const result = await verifyTotpCodeAction(INPUT);

    expect(result.data).toEqual({ ok: false, failure: "unavailable" });
    expect(consumeTotpVerifyAllowance).not.toHaveBeenCalled();
    expect(verifyTotpCode).not.toHaveBeenCalled();
  });

  it("sends a signed-out caller to /login and a verified admin to /admin, verifying nothing", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });
    expect(await redirectedTo(() => verifyTotpCodeAction(INPUT))).toBe("/login");

    redirect.mockClear();
    vi.mocked(getSessionState).mockResolvedValue({ ...PASSWORD_ONLY, aal: "aal2" });
    expect(await redirectedTo(() => verifyTotpCodeAction(INPUT))).toBe("/admin");
    expect(verifyTotpCode).not.toHaveBeenCalled();
  });
});

describe("startTotpEnrolmentAction", () => {
  const ENROLMENT = { ok: true, factorId: INPUT.factorId, qrCode: "qr", secret: "secret" } as const;

  // implements FR-7 of pre-deploy-security-hardening
  it("starts the enrolment for an admin without the factor", async () => {
    vi.mocked(startTotpEnrolment).mockResolvedValue(ENROLMENT);

    expect((await startTotpEnrolmentAction()).data).toEqual(ENROLMENT);
  });

  // implements FR-7 of pre-deploy-security-hardening: regular users are offered no second factor
  it("enrolls nothing for a non-admin or an unreadable session", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: false });
    expect((await startTotpEnrolmentAction()).data).toEqual({ ok: false, failure: "unavailable" });

    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });
    expect((await startTotpEnrolmentAction()).data).toEqual({ ok: false, failure: "unavailable" });
    expect(startTotpEnrolment).not.toHaveBeenCalled();
  });
});
