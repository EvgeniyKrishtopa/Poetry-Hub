// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { readTotpFactor, startTotpEnrolment, verifyTotpCode } from "../../dal/totp";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const FACTOR_ID = "5b1f0a52-3a39-4d0e-9f0c-2f0a3b6c9d11";
const SECRET = "JBSWY3DPEHPK3PXP";
const QR_CODE = "data:image/svg+xml;utf-8,<svg/>";
const CODE = "123456";

const mfa = { listFactors: vi.fn(), unenroll: vi.fn(), enroll: vi.fn(), challengeAndVerify: vi.fn() };
const logged: unknown[] = [];

function factors(...all: { id: string; status: string }[]) {
  const rows = all.map((factor) => ({ ...factor, factor_type: "totp" }));
  return { data: { all: rows, totp: rows.filter((factor) => factor.status === "verified") }, error: null };
}

function authError(code?: string) {
  return Object.assign(new Error(`${SECRET} ${CODE}`), { name: "AuthApiError", code });
}

beforeEach(() => {
  logged.length = 0;
  vi.spyOn(console, "error").mockImplementation((...args) => void logged.push(...args));
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { mfa } } as never);
});

afterEach(() => {
  // implements NFR-2 of pre-deploy-security-hardening
  for (const line of logged) {
    for (const secret of [SECRET, CODE, QR_CODE, FACTOR_ID]) expect(String(line)).not.toContain(secret);
  }
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("readTotpFactor", () => {
  // implements FR-8 of pre-deploy-security-hardening
  it("answers enrolled with the verified factor, and not-enrolled when there is only an unfinished one", async () => {
    mfa.listFactors.mockResolvedValueOnce(factors({ id: FACTOR_ID, status: "verified" }));
    expect(await readTotpFactor()).toEqual({ ok: true, status: "enrolled", factorId: FACTOR_ID });

    mfa.listFactors.mockResolvedValueOnce(factors({ id: FACTOR_ID, status: "unverified" }));
    expect(await readTotpFactor()).toEqual({ ok: true, status: "not-enrolled" });
  });

  it("answers unavailable, never not-enrolled, when the factors can't be read", async () => {
    mfa.listFactors.mockResolvedValueOnce({ data: null, error: authError() });
    expect(await readTotpFactor()).toEqual({ ok: false, failure: "unavailable" });

    mfa.listFactors.mockRejectedValueOnce(authError());
    expect(await readTotpFactor()).toEqual({ ok: false, failure: "unavailable" });
  });
});

describe("startTotpEnrolment", () => {
  // The shape Auth really answers with: the SVG ends with a newline, which `next/image` refuses.
  const enrolled = { data: { id: FACTOR_ID, totp: { qr_code: `${QR_CODE}\n`, secret: SECRET } }, error: null };

  // implements FR-7 of pre-deploy-security-hardening: abandoned enrolment
  it("removes an unfinished factor before enrolling a new one", async () => {
    mfa.listFactors.mockResolvedValue(factors({ id: "old", status: "unverified" }));
    mfa.unenroll.mockResolvedValue({ error: null });
    mfa.enroll.mockResolvedValue(enrolled);

    expect(await startTotpEnrolment()).toEqual({ ok: true, factorId: FACTOR_ID, qrCode: QR_CODE, secret: SECRET });
    expect(mfa.unenroll).toHaveBeenCalledExactlyOnceWith({ factorId: "old" });
    expect(mfa.unenroll.mock.invocationCallOrder[0]).toBeLessThan(mfa.enroll.mock.invocationCallOrder[0] ?? 0);
    expect(mfa.enroll).toHaveBeenCalledExactlyOnceWith({ factorType: "totp" });
  });

  it("never removes a verified factor", async () => {
    mfa.listFactors.mockResolvedValue(factors({ id: FACTOR_ID, status: "verified" }));
    mfa.enroll.mockResolvedValue({ data: null, error: authError("insufficient_aal") });

    expect(await startTotpEnrolment()).toEqual({ ok: false, failure: "unavailable" });
    expect(mfa.unenroll).not.toHaveBeenCalled();
  });

  it("answers unavailable, enrolling nothing, when the list or the removal fails", async () => {
    mfa.listFactors.mockResolvedValueOnce({ data: null, error: authError() });
    expect(await startTotpEnrolment()).toEqual({ ok: false, failure: "unavailable" });

    mfa.listFactors.mockResolvedValueOnce(factors({ id: "old", status: "unverified" }));
    mfa.unenroll.mockResolvedValueOnce({ error: authError() });
    expect(await startTotpEnrolment()).toEqual({ ok: false, failure: "unavailable" });

    mfa.listFactors.mockRejectedValueOnce(authError());
    expect(await startTotpEnrolment()).toEqual({ ok: false, failure: "unavailable" });
    expect(mfa.enroll).not.toHaveBeenCalled();
  });
});

describe("verifyTotpCode", () => {
  // implements FR-7, FR-8 of pre-deploy-security-hardening
  it("challenges and verifies the code", async () => {
    mfa.challengeAndVerify.mockResolvedValue({ error: null });

    expect(await verifyTotpCode(FACTOR_ID, CODE)).toEqual({ ok: true });
    expect(mfa.challengeAndVerify).toHaveBeenCalledExactlyOnceWith({ factorId: FACTOR_ID, code: CODE });
  });

  // implements FR-7 of pre-deploy-security-hardening: wrong code
  it("tells a wrong code from any other failure", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ error: authError("mfa_verification_failed") });
    expect(await verifyTotpCode(FACTOR_ID, CODE)).toEqual({ ok: false, failure: "wrong-code" });

    mfa.challengeAndVerify.mockResolvedValueOnce({ error: authError("over_request_rate_limit") });
    expect(await verifyTotpCode(FACTOR_ID, CODE)).toEqual({ ok: false, failure: "unavailable" });

    mfa.challengeAndVerify.mockRejectedValueOnce(authError());
    expect(await verifyTotpCode(FACTOR_ID, CODE)).toEqual({ ok: false, failure: "unavailable" });
  });
});
