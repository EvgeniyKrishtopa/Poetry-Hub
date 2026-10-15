import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInFormWithError } from "../../components/SignInFormWithError/SignInFormWithError";
import { CONFIRM_FAILED_ERROR } from "../../model/auth.constants";
import { CONFIRM_FAILED_MESSAGE } from "../../model/auth-messages";

vi.mock("../../actions/auth.actions", () => ({ signInAction: vi.fn() }));

async function renderWithError(error?: string) {
  render(await SignInFormWithError({ searchParams: Promise.resolve({ error }) }));
}

describe("SignInFormWithError", () => {
  // implements FR-5 of add-supabase-auth
  it("shows the confirm-failed alert when the error param asks for it", async () => {
    await renderWithError(CONFIRM_FAILED_ERROR);

    expect(screen.getByRole("alert")).toHaveTextContent(CONFIRM_FAILED_MESSAGE);
  });

  it("shows the form without an alert for no or an unknown error param", async () => {
    await renderWithError("something-else");

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
