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
  if (email) await user.type(screen.getByLabelText("Электронная почта"), email);
  if (password) await user.type(screen.getByLabelText("Пароль"), password);
  await user.click(screen.getByRole("button", { name: "Войти" }));
}

describe("SignInForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-1 of add-supabase-auth
  // implements NFR-3 of add-supabase-auth
  it("renders labelled inputs with the right autocomplete, a submit button, and a sign-up link", () => {
    render(<SignInForm />);

    const email = screen.getByRole("textbox", { name: "Электронная почта" });
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    const password = screen.getByLabelText("Пароль");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Создать аккаунт" })).toHaveAttribute("href", "/signup");
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
        fieldErrors: { email: ["Введите корректный адрес электронной почты."], password: ["Введите пароль."] },
      },
    });
    render(<SignInForm />);

    await submit("not-an-email", "");

    for (const [label, message] of [
      ["Электронная почта", "Введите корректный адрес электронной почты."],
      ["Пароль", "Введите пароль."],
    ]) {
      const input = await screen.findByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(message);
    }
  });

  // implements FR-2 of add-supabase-auth
  it.each<[AuthFailure, string]>([
    ["invalid-credentials", "Неверный адрес электронной почты или пароль."],
    ["email-not-confirmed", "Сначала подтвердите адрес электронной почты: ссылка в письме, которое мы отправили."],
    ["rate-limited", "Слишком много попыток. Попробуйте через несколько минут."],
    ["unavailable", "Вход сейчас недоступен."],
    ["unknown", "Что-то пошло не так. Попробуйте ещё раз."],
  ])("shows the %s alert and keeps the email", async (failure, message) => {
    mockResult({ data: { status: "failed", failure } });
    render(<SignInForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Электронная почта")).toHaveValue(EMAIL);
    expect(screen.getByLabelText("Пароль")).toHaveValue("");
  });

  it("shows the generic alert for a serverError", async () => {
    mockResult({ serverError: "Что-то пошло не так. Попробуйте ещё раз." });
    render(<SignInForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Что-то пошло не так. Попробуйте ещё раз.");
  });

  // implements NFR-3 of add-supabase-auth
  it("disables the submit button while the submission is pending", async () => {
    let resolve: (result: SignInActionResult) => void = () => {};
    vi.mocked(signInAction).mockReturnValue(new Promise((done) => (resolve = done)));
    render(<SignInForm />);

    await submit();

    expect(screen.getByRole("button", { name: "Войти" })).toBeDisabled();
    resolve({ data: { status: "failed", failure: "unknown" } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled();
  });

  // implements FR-5 of add-supabase-auth
  it("shows the initial error until the first submission replaces it", async () => {
    mockResult({ data: { status: "failed", failure: "invalid-credentials" } });
    render(<SignInForm initialError={CONFIRM_FAILED_MESSAGE} />);

    expect(screen.getByRole("alert")).toHaveTextContent(CONFIRM_FAILED_MESSAGE);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Неверный адрес электронной почты или пароль.");
  });
});

describe("SignInForm feedback tones", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-2 of add-feedback-color-tokens
  it("shows field errors in danger, with a danger border kept while focused", async () => {
    mockResult({
      validationErrors: { formErrors: [], fieldErrors: { email: ["Введите корректный адрес электронной почты."] } },
    });
    render(<SignInForm />);

    await submit("not-an-email", "");

    const email = await screen.findByLabelText("Электронная почта");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveClass("aria-invalid:border-danger", "aria-invalid:focus:border-danger", "focus:border-accent");
    expect(screen.getByText("Введите корректный адрес электронной почты.")).toHaveClass("text-danger");
  });

  // implements FR-4 of add-feedback-color-tokens
  it("shows the wrong-credentials message inside the danger alert", async () => {
    mockResult({ data: { status: "failed", failure: "invalid-credentials" } });
    render(<SignInForm />);

    await submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Неверный адрес электронной почты или пароль.");
    expect(alert).toHaveClass("border-danger", "border-l-4");
  });
});
