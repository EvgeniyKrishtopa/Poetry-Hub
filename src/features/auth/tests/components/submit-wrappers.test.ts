import { afterEach, describe, expect, it, vi } from "vitest";

import { requestRecoveryAction, updatePasswordAction } from "../../actions/auth.actions";
import { submitNewPassword } from "../../components/ResetPasswordForm/submit-new-password";
import { submitRecoveryRequest } from "../../components/SignInForm/submit-recovery-request";

vi.mock("../../actions/auth.actions", () => ({ requestRecoveryAction: vi.fn(), updatePasswordAction: vi.fn() }));

const PASSWORD = "correct-horse-battery";
const FAILED_UNKNOWN = { status: "failed", failure: "unknown" } as const;

function passwordForm(): FormData {
  const formData = new FormData();
  formData.set("password", PASSWORD);
  return formData;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("submitRecoveryRequest", () => {
  // implements FR-2 of password-recovery
  it("answers the generic failure when the connection drops, and not a thrown page error", async () => {
    vi.mocked(requestRecoveryAction).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(submitRecoveryRequest("reader@example.com")).resolves.toEqual(FAILED_UNKNOWN);
  });

  // implements FR-2 of password-recovery
  it("rethrows any other error, so nothing else is hidden", async () => {
    const error = new Error("something else");
    vi.mocked(requestRecoveryAction).mockRejectedValue(error);

    await expect(submitRecoveryRequest("reader@example.com")).rejects.toBe(error);
  });
});

describe("submitNewPassword", () => {
  // implements FR-8 of password-recovery
  it("answers the generic failure when the connection drops, and not a thrown page error", async () => {
    vi.mocked(updatePasswordAction).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(submitNewPassword({ status: "idle" }, passwordForm())).resolves.toEqual(FAILED_UNKNOWN);
  });

  // implements FR-6 of password-recovery
  it("rethrows any other error, a redirect's included, so Next still follows it", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/reset-password" });
    vi.mocked(updatePasswordAction).mockRejectedValue(redirect);

    await expect(submitNewPassword({ status: "idle" }, passwordForm())).rejects.toBe(redirect);
  });

  // implements NFR-1 of password-recovery
  it("passes only the password on and keeps nothing of it in the failure it returns", async () => {
    vi.mocked(updatePasswordAction).mockRejectedValue(new TypeError("Failed to fetch"));

    const state = await submitNewPassword({ status: "idle" }, passwordForm());

    expect(updatePasswordAction).toHaveBeenCalledExactlyOnceWith({ password: PASSWORD });
    expect(JSON.stringify(state)).not.toContain(PASSWORD);
  });
});
