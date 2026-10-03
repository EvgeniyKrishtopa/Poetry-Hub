import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { signUpAction } from "../../actions/auth.actions";
import { SignUpForm } from "../../components/SignUpForm/SignUpForm";

vi.mock("../../actions/auth.actions", () => ({
  signUpAction: vi.fn(),
}));

const EMAIL = "reader@example.com";
const PASSWORD = "secret-password-1";

type SignUpActionResult = Awaited<ReturnType<typeof signUpAction>>;

function mockResult(result: SignUpActionResult) {
  vi.mocked(signUpAction).mockResolvedValue(result);
}

async function submit(email = EMAIL, password = PASSWORD) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-3 of add-supabase-auth
  // implements NFR-3 of add-supabase-auth
  it("renders labelled inputs with the right autocomplete, a submit button, and a sign-in link", () => {
    render(<SignUpForm />);

    const email = screen.getByRole("textbox", { name: "Email" });
    expect(email).toHaveAttribute("autocomplete", "email");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(email.closest("form")).toHaveAttribute("novalidate");
  });

  // implements FR-4 of add-supabase-auth
  it("replaces the form with the check-email message naming the address", async () => {
    mockResult({ data: { status: "check-email", email: EMAIL } });
    render(<SignUpForm />);

    await submit();

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Check your email");
    expect(status).toHaveTextContent(EMAIL);
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
    expect(signUpAction).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
  });

  // implements NFR-3 of add-supabase-auth
  it("shows a server validation error on the password field", async () => {
    mockResult({
      validationErrors: { formErrors: [], fieldErrors: { password: ["Use at least 8 characters."] } },
    });
    render(<SignUpForm />);

    await submit(EMAIL, "1234567");

    const password = await screen.findByLabelText("Password");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription("Use at least 8 characters.");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  // implements FR-4 of add-supabase-auth
  it("shows Supabase's weak_password rejection on the password field, not as an alert", async () => {
    mockResult({ data: { status: "failed", failure: "weak-password" } });
    render(<SignUpForm />);

    await submit();

    expect(await screen.findByLabelText("Password")).toHaveAccessibleDescription("Choose a stronger password.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-4 of add-supabase-auth
  it.each<[string, SignUpActionResult, string]>([
    ["rate limit", { data: { status: "failed", failure: "rate-limited" } }, "Too many attempts. Try again in a few minutes."],
    ["missing config", { data: { status: "failed", failure: "unavailable" } }, "Sign-up is unavailable right now."],
    ["other failure", { data: { status: "failed", failure: "unknown" } }, "Something went wrong. Try again."],
    ["serverError", { serverError: "Something went wrong. Try again." }, "Something went wrong. Try again."],
  ])("shows the %s alert and keeps the email", async (_label, result, message) => {
    mockResult(result);
    render(<SignUpForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  // implements NFR-3 of add-supabase-auth
  it("disables the submit button while the submission is pending", async () => {
    vi.mocked(signUpAction).mockReturnValue(new Promise(() => {}));
    render(<SignUpForm />);

    await submit();

    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
  });
});
