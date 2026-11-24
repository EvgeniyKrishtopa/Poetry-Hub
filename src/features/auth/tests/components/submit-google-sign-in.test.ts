import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { startGoogleSignInAction } from "../../actions/auth.actions";
import { submitGoogleSignIn } from "../../components/GoogleSignInButton/submit-google-sign-in";

vi.mock("../../actions/auth.actions", () => ({ startGoogleSignInAction: vi.fn() }));

const GOOGLE_URL = "https://accounts.example.test/authorize";

/** The error Next throws for `redirect()`, as a successful start rejects the action's promise with it. */
function captureRedirectError(): unknown {
  try {
    redirect(GOOGLE_URL);
  } catch (error) {
    return error;
  }
  throw new Error("redirect() did not throw");
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("submitGoogleSignIn", () => {
  // implements FR-G1 of google-sign-in: a call that never reaches the server is a failed start, not a page error
  it("returns the failed start when the call itself fails", async () => {
    vi.mocked(startGoogleSignInAction).mockRejectedValue(new TypeError("fetch failed"));

    const state = await submitGoogleSignIn("sign-in");

    expect(state).toEqual({ status: "failed" });
  });

  // implements FR-G1 of google-sign-in: the redirect to Google is never swallowed
  it("lets Next's redirect to Google through", async () => {
    const redirectError = captureRedirectError();
    vi.mocked(startGoogleSignInAction).mockRejectedValue(redirectError);

    const submission = submitGoogleSignIn("sign-up");

    await expect(submission).rejects.toBe(redirectError);
  });
});
