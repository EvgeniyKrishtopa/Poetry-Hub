import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installFakeTurnstile } from "@/shared/ui/tests/fake-turnstile";

import { signUpAction } from "../../actions/auth.actions";
import { SignUpForm } from "../../components/SignUpForm/SignUpForm";
import { CAPTCHA_FAILED_MESSAGE } from "../../model/auth-messages";

vi.mock("../../actions/auth.actions", () => ({
  signUpAction: vi.fn(),
}));

const turnstile = installFakeTurnstile();

const EMAIL = "reader@example.com";
const PASSWORD = "secret-password-1";

type SignUpActionResult = Awaited<ReturnType<typeof signUpAction>>;

function mockResult(result: SignUpActionResult) {
  vi.mocked(signUpAction).mockResolvedValue(result);
}

async function submit(email = EMAIL, password = PASSWORD) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Электронная почта"), email);
  await user.type(screen.getByLabelText("Пароль"), password);
  // Disabled until the check passes and gives a token.
  await waitFor(() => expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
}

describe("SignUpForm feedback tones", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-4 of add-feedback-color-tokens
  it("shows a sign-up failure inside the danger alert", async () => {
    mockResult({ data: { status: "failed", failure: "rate-limited" } });
    render(<SignUpForm />);

    await submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Слишком много попыток. Попробуйте через несколько минут.");
    expect(alert).toHaveClass("border-danger", "border-l-4");
  });

  // implements FR-6 of add-feedback-color-tokens
  it("shows check-email inside the success alert, with foreground text", async () => {
    mockResult({ data: { status: "check-email", email: EMAIL } });
    render(<SignUpForm />);

    await submit();

    const status = await screen.findByRole("status");
    expect(status).toHaveClass("border-success", "border-l-4");
    expect(status).toHaveTextContent("Проверьте почту");
    expect(status).toHaveTextContent(EMAIL);
    // muted on surface is about 4.4:1 in light, below AA, so the body paragraph inherits foreground.
    expect(status.querySelector(".text-muted")).toBeNull();
  });
});

describe("SignUpForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-3 of add-supabase-auth
  // implements NFR-3 of add-supabase-auth
  it("renders labelled inputs with the right autocomplete, a submit button, and a sign-in link", async () => {
    render(<SignUpForm />);

    const email = screen.getByRole("textbox", { name: "Электронная почта" });
    expect(email).toHaveAttribute("autocomplete", "email");
    const password = screen.getByLabelText("Пароль");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "new-password");
    await waitFor(() => expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeEnabled());
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login");
    expect(email.closest("form")).toHaveAttribute("novalidate");
  });

  // implements FR-4 of add-supabase-auth
  it("replaces the form with the check-email message naming the address", async () => {
    mockResult({ data: { status: "check-email", email: EMAIL } });
    render(<SignUpForm />);

    await submit();

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Проверьте почту");
    expect(status).toHaveTextContent(EMAIL);
    expect(screen.queryByRole("button", { name: "Зарегистрироваться" })).not.toBeInTheDocument();
    expect(signUpAction).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD, captchaToken: "token-1" });
  });

  // implements FR-5 of pre-deploy-security-hardening
  it("shows a rejected captcha above the check block, resets the check, and sends a new token next", async () => {
    mockResult({ data: { status: "failed", failure: "captcha" } });
    render(<SignUpForm />);

    await submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(CAPTCHA_FAILED_MESSAGE);
    expect(alert.nextElementSibling).toBe(screen.getByRole("group"));
    expect(turnstile.reset).toHaveBeenCalledOnce();
    await waitFor(() => expect(turnstile.issued).toHaveLength(2));
  });

  // implements NFR-3 of add-supabase-auth
  it("shows a server validation error on the password field", async () => {
    mockResult({
      validationErrors: { formErrors: [], fieldErrors: { password: ["Не менее 12 символов."] } },
    });
    render(<SignUpForm />);

    await submit(EMAIL, "1234567");

    const password = await screen.findByLabelText("Пароль");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription("Не менее 12 символов.");
    expect(screen.getByLabelText("Электронная почта")).not.toHaveAttribute("aria-invalid");
  });

  // implements FR-4 of add-supabase-auth
  it("shows Supabase's weak_password rejection on the password field, not as an alert", async () => {
    mockResult({ data: { status: "failed", failure: "weak-password" } });
    render(<SignUpForm />);

    await submit();

    expect(await screen.findByLabelText("Пароль")).toHaveAccessibleDescription("Придумайте пароль надёжнее.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-4 of add-supabase-auth
  it.each<[string, SignUpActionResult, string]>([
    ["rate limit", { data: { status: "failed", failure: "rate-limited" } }, "Слишком много попыток. Попробуйте через несколько минут."],
    ["missing config", { data: { status: "failed", failure: "unavailable" } }, "Регистрация сейчас недоступна."],
    ["other failure", { data: { status: "failed", failure: "unknown" } }, "Что-то пошло не так. Попробуйте ещё раз."],
    ["serverError", { serverError: "Что-то пошло не так. Попробуйте ещё раз." }, "Что-то пошло не так. Попробуйте ещё раз."],
  ])("shows the %s alert and keeps the email", async (_label, result, message) => {
    mockResult(result);
    render(<SignUpForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Электронная почта")).toHaveValue(EMAIL);
    expect(screen.getByLabelText("Пароль")).toHaveValue("");
  });

  // implements NFR-3 of add-supabase-auth
  it("disables the submit button while the submission is pending", async () => {
    vi.mocked(signUpAction).mockReturnValue(new Promise(() => {}));
    render(<SignUpForm />);

    await submit();

    expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeDisabled();
  });
});
