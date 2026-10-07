import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { signInAction } from "../../actions/auth.actions";
import { SignInForm } from "../../components/SignInForm/SignInForm";
import { CONFIRM_FAILED_MESSAGE } from "../../model/auth-messages";
import type { AuthFailure } from "../../model/auth.types";

vi.mock("../../actions/auth.actions", () => ({
  signInAction: vi.fn(),
}));

const EMAIL = "reader@example.com";
const PASSWORD = "secret-password-1";

type SignInActionResult = Awaited<ReturnType<typeof signInAction>>;

function mockResult(result: SignInActionResult) {
  vi.mocked(signInAction).mockResolvedValue(result);
}

async function submit(email = EMAIL, password = PASSWORD) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-1 of add-supabase-auth
  // implements NFR-3 of add-supabase-auth
  it("renders labelled inputs with the right autocomplete, a submit button, and a sign-up link", () => {
    render(<SignInForm />);

    const email = screen.getByRole("textbox", { name: "Email" });
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/signup");
    expect(email.closest("form")).toHaveAttribute("novalidate");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-2 of add-supabase-auth
  it("sends the typed credentials to signInAction", async () => {
    mockResult({ data: { status: "failed", failure: "invalid-credentials" } });
    render(<SignInForm />);

    await submit();

    expect(signInAction).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
  });

  // implements NFR-3 of add-supabase-auth
  it("shows server field errors wired to their inputs", async () => {
    mockResult({
      validationErrors: {
        formErrors: [],
        fieldErrors: { email: ["Enter a valid email address."], password: ["Enter your password."] },
      },
    });
    render(<SignInForm />);

    await submit("not-an-email", "");

    for (const [label, message] of [
      ["Email", "Enter a valid email address."],
      ["Password", "Enter your password."],
    ]) {
      const input = await screen.findByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(message);
    }
  });

  // implements FR-2 of add-supabase-auth
  it.each<[AuthFailure, string]>([
    ["invalid-credentials", "Incorrect email or password."],
    ["email-not-confirmed", "Confirm your email first. Check your inbox for the link."],
    ["rate-limited", "Too many attempts. Try again in a few minutes."],
    ["unavailable", "Sign-in is unavailable right now."],
    ["unknown", "Something went wrong. Try again."],
  ])("shows the %s alert and keeps the email", async (failure, message) => {
    mockResult({ data: { status: "failed", failure } });
    render(<SignInForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("shows the generic alert for a serverError", async () => {
    mockResult({ serverError: "Something went wrong. Try again." });
    render(<SignInForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });

  // implements NFR-3 of add-supabase-auth
  it("disables the submit button while the submission is pending", async () => {
    let resolve: (result: SignInActionResult) => void = () => {};
    vi.mocked(signInAction).mockReturnValue(new Promise((done) => (resolve = done)));
    render(<SignInForm />);

    await submit();

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    resolve({ data: { status: "failed", failure: "unknown" } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  // implements FR-5 of add-supabase-auth
  it("shows the initial error until the first submission replaces it", async () => {
    mockResult({ data: { status: "failed", failure: "invalid-credentials" } });
    render(<SignInForm initialError={CONFIRM_FAILED_MESSAGE} />);

    expect(screen.getByRole("alert")).toHaveTextContent(CONFIRM_FAILED_MESSAGE);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });
});

describe("SignInForm feedback tones", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-2 of add-feedback-color-tokens
  it("shows field errors in danger, with a danger border kept while focused", async () => {
    mockResult({
      validationErrors: { formErrors: [], fieldErrors: { email: ["Enter a valid email address."] } },
    });
    render(<SignInForm />);

    await submit("not-an-email", "");

    const email = await screen.findByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveClass("aria-invalid:border-danger", "aria-invalid:focus:border-danger", "focus:border-accent");
    expect(screen.getByText("Enter a valid email address.")).toHaveClass("text-danger");
  });

  // implements FR-4 of add-feedback-color-tokens
  it("shows the wrong-credentials message inside the danger alert", async () => {
    mockResult({ data: { status: "failed", failure: "invalid-credentials" } });
    render(<SignInForm />);

    await submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Incorrect email or password.");
    expect(alert).toHaveClass("border-danger", "border-l-4");
  });
});
