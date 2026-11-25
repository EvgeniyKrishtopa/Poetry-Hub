import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInFormWithError } from "../../components/SignInFormWithError/SignInFormWithError";
import { CONFIRM_FAILED_ERROR, RECOVERY_FAILED_ERROR } from "../../model/auth.constants";
import { CONFIRM_FAILED_MESSAGE, RECOVERY_FAILED_MESSAGE, RECOVERY_OFFER_BUTTON_LABEL } from "../../model/auth-messages";

vi.mock("../../actions/auth.actions", () => ({ signInAction: vi.fn(), requestRecoveryAction: vi.fn() }));

async function renderWithError(error?: string) {
  render(await SignInFormWithError({ error: Promise.resolve(error) }));
}

describe("SignInFormWithError", () => {
  // implements FR-5 of add-supabase-auth
  it("shows the confirm-failed alert when the error param asks for it", async () => {
    await renderWithError(CONFIRM_FAILED_ERROR);

    expect(screen.getByRole("alert")).toHaveTextContent(CONFIRM_FAILED_MESSAGE);
  });

  // implements FR-3 of password-recovery
  it("shows the recovery-failed alert with the offer when the error param says so", async () => {
    await renderWithError(RECOVERY_FAILED_ERROR);

    expect(screen.getByRole("alert")).toHaveTextContent(RECOVERY_FAILED_MESSAGE);
    expect(screen.getByRole("button", { name: RECOVERY_OFFER_BUTTON_LABEL })).toBeInTheDocument();
  });

  // implements FR-1 of password-recovery
  it("shows no offer for the confirm-failed alert", async () => {
    await renderWithError(CONFIRM_FAILED_ERROR);

    expect(screen.queryByRole("button", { name: RECOVERY_OFFER_BUTTON_LABEL })).not.toBeInTheDocument();
  });

  it("shows the form without an alert for no or an unknown error param", async () => {
    await renderWithError("something-else");

    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
