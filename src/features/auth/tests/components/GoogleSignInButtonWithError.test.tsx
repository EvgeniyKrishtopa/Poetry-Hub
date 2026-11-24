import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleSignInButtonWithError } from "../../components/GoogleSignInButtonWithError/GoogleSignInButtonWithError";
import { SignInFormWithError } from "../../components/SignInFormWithError/SignInFormWithError";
import { SignUpForm } from "../../components/SignUpForm/SignUpForm";
import {
  CONFIRM_FAILED_MESSAGE,
  GOOGLE_BLOCKED_MESSAGE,
  GOOGLE_BUTTON_LABEL,
  GOOGLE_CANCELLED_MESSAGE,
  GOOGLE_FAILED_MESSAGE,
} from "../../model/auth-messages";
import type { GoogleFlow } from "../../model/auth.types";

vi.mock("../../actions/auth.actions", () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
  startGoogleSignInAction: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const GOOGLE_NOTICES = [
  ["google-cancelled", GOOGLE_CANCELLED_MESSAGE],
  ["google-failed", GOOGLE_FAILED_MESSAGE],
  ["google-blocked", GOOGLE_BLOCKED_MESSAGE],
] as const;

const FLOWS: readonly GoogleFlow[] = ["sign-in", "sign-up"];

/** What each page's request-time boundaries resolve to: the password form, then the Google button. */
async function renderResolvedPage(from: GoogleFlow, error: string | undefined) {
  const errorParam = Promise.resolve(error);
  const passwordForm = from === "sign-in" ? await SignInFormWithError({ error: errorParam }) : <SignUpForm />;
  const googleButton = await GoogleSignInButtonWithError({ from, error: errorParam });
  render(
    <>
      {passwordForm}
      {googleButton}
    </>,
  );
}

function getForms() {
  const googleButton = screen.getByRole("button", { name: /через Google/ });
  const googleForm = googleButton.closest("form");
  const passwordForm = screen.getByLabelText("Пароль").closest("form");
  if (googleForm === null || passwordForm === null) throw new Error("both forms must render");
  return { googleButton, googleForm, passwordForm };
}

describe("GoogleSignInButtonWithError", () => {
  // implements FR-G4, FR-G5 of google-sign-in, FR-5 of add-supabase-auth
  describe.each(FLOWS)("on the %s page", (from) => {
    it.each(GOOGLE_NOTICES)("shows ?error=%s above the Google button and not in the password form", async (error, text) => {
      await renderResolvedPage(from, error);

      const { googleButton, googleForm, passwordForm } = getForms();
      const alert = within(googleForm).getByRole("alert");
      expect(alert).toHaveTextContent(text);
      expect(alert.compareDocumentPosition(googleButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(passwordForm).queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getAllByRole("alert")).toHaveLength(1);
    });

    it.each([undefined, "something-else", "google-unknown"])("shows no alert for ?error=%s", async (error) => {
      await renderResolvedPage(from, error);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("labels the button for its page", async () => {
      await renderResolvedPage(from, undefined);

      expect(screen.getByRole("button", { name: GOOGLE_BUTTON_LABEL[from] })).toBeInTheDocument();
    });
  });

  // implements FR-5 of add-supabase-auth: confirm-failed keeps its place inside the password form
  it("keeps /login?error=confirm-failed inside the password form, with no Google alert", async () => {
    await renderResolvedPage("sign-in", "confirm-failed");

    const { googleForm, passwordForm } = getForms();
    expect(within(passwordForm).getByRole("alert")).toHaveTextContent(CONFIRM_FAILED_MESSAGE);
    expect(within(googleForm).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores a repeated error parameter", async () => {
    const element = await GoogleSignInButtonWithError({
      from: "sign-in",
      error: Promise.resolve(["google-blocked", "google-failed"]),
    });
    render(element);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
