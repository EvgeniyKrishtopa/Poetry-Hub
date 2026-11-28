// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { startTotpEnrolmentAction } from "../../actions/start-totp-enrolment.actions";
import { verifyTotpCodeAction } from "../../actions/verify-totp-code.actions";
import { submitTotpCode } from "../../components/TotpCodeForm/submit-totp-code";
import { startEnrolment } from "../../components/TotpEnrolment/start-enrolment";

vi.mock("../../actions/start-totp-enrolment.actions", () => ({ startTotpEnrolmentAction: vi.fn() }));
vi.mock("../../actions/verify-totp-code.actions", () => ({ verifyTotpCodeAction: vi.fn() }));

const INPUT = { factorId: "5b1f0a52-3a39-4d0e-9f0c-2f0a3b6c9d11", code: "123456" };
const REDIRECT = new Error("NEXT_REDIRECT");

afterEach(() => vi.clearAllMocks());

describe("the second factor action wrappers", () => {
  // implements FR-7, FR-8 of pre-deploy-security-hardening: the redirect to /login or /admin reaches Next
  it("rethrow a redirect instead of reading it as unavailable", async () => {
    vi.mocked(verifyTotpCodeAction).mockRejectedValue(REDIRECT);
    vi.mocked(startTotpEnrolmentAction).mockRejectedValue(REDIRECT);

    await expect(submitTotpCode(INPUT)).rejects.toBe(REDIRECT);
    await expect(startEnrolment()).rejects.toBe(REDIRECT);
  });

  // implements FR-7 of pre-deploy-security-hardening
  it("read a masked server error as unavailable", async () => {
    vi.mocked(startTotpEnrolmentAction).mockResolvedValue({ serverError: "masked" });

    expect(await startEnrolment()).toEqual({ ok: false, failure: "unavailable" });
  });
});
