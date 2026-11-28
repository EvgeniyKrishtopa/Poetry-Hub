// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ClaimsState, readClaimsState } from "@/shared/lib/supabase/claims";

import { getSessionState } from "../../dal/current-user";
import { checkRecoverySession } from "../../dal/recovery-check";

vi.mock("../../dal/current-user", () => ({ getSessionState: vi.fn() }));

const NOW = new Date("2026-11-28T12:00:00Z");
const NOW_SECONDS = NOW.getTime() / 1000;

function sessionWith(amr: unknown): ClaimsState {
  return readClaimsState({ data: { claims: { sub: "user-1", amr } }, error: null });
}

describe("checkRecoverySession", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // implements FR-3 of pre-deploy-security-hardening
  it("is recovery for a link followed five minutes ago", async () => {
    const session = sessionWith([{ method: "otp", timestamp: NOW_SECONDS - 300 }]);
    vi.mocked(getSessionState).mockResolvedValue(session);

    await expect(checkRecoverySession()).resolves.toBe("recovery");
  });

  // implements FR-3 of pre-deploy-security-hardening
  it.each<[string, unknown]>([
    ["a password session", [{ method: "password", timestamp: NOW_SECONDS }]],
    ["a stale link", [{ method: "otp", timestamp: NOW_SECONDS - 901 }]],
    ["no amr", undefined],
    ["an amr of plain strings", ["otp"]],
    ["an entry without a timestamp", [{ method: "otp" }]],
  ])("is not-recovery for %s", async (_label, amr) => {
    const session = sessionWith(amr);
    vi.mocked(getSessionState).mockResolvedValue(session);

    await expect(checkRecoverySession()).resolves.toBe("not-recovery");
  });

  // implements FR-3 of pre-deploy-security-hardening
  it("is not-recovery for a signed-out request", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    await expect(checkRecoverySession()).resolves.toBe("not-recovery");
  });

  // implements FR-3 of pre-deploy-security-hardening
  it("is unknown when the session check cannot tell", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    await expect(checkRecoverySession()).resolves.toBe("unknown");
  });
});
