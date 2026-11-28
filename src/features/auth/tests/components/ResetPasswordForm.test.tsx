import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { updatePasswordAction } from "../../actions/auth.actions";
import { ResetPasswordForm } from "../../components/ResetPasswordForm/ResetPasswordForm";
import { BACK_TO_SIGN_IN_LABEL, NEW_PASSWORD_LABEL, NEW_PASSWORD_SUBMIT_LABEL } from "../../model/auth-messages";
import { CONNECTION_NOTICE_MESSAGES } from "@/shared/ui/ui-messages";

vi.mock("../../actions/auth.actions", () => ({ updatePasswordAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "slow" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

type Response = Awaited<ReturnType<typeof updatePasswordAction>>;

const PASSWORD = "correct-horse-battery";
const RATE_LIMITED_MESSAGE = "Слишком много попыток. Попробуйте через несколько минут.";
const GENERIC_MESSAGE = "Что-то пошло не так. Попробуйте ещё раз.";

function field(): HTMLElement {
  return screen.getByLabelText(NEW_PASSWORD_LABEL);
}

function submitButton(): HTMLElement {
  return screen.getByRole("button", { name: NEW_PASSWORD_SUBMIT_LABEL });
}

async function submit(password = PASSWORD): Promise<void> {
  const user = userEvent.setup();
  await user.type(field(), password);
  await user.click(submitButton());
}

function answer(response: Response): void {
  vi.mocked(updatePasswordAction).mockResolvedValue(response);
}

afterEach(() => {
  vi.clearAllMocks();
  connection.status = "online";
});

describe("ResetPasswordForm", () => {
  // implements FR-4 of password-recovery
  it("renders one labelled new-password field and the submit button", () => {
    render(<ResetPasswordForm />);

    expect(field()).toHaveAttribute("type", "password");
    expect(field()).toHaveAttribute("autocomplete", "new-password");
    expect(submitButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-5 of password-recovery
  it("sends only the typed password to the action", async () => {
    answer({ data: { status: "failed", failure: "unknown" } });
    render(<ResetPasswordForm />);

    await submit();

    expect(updatePasswordAction).toHaveBeenCalledExactlyOnceWith({ password: PASSWORD });
  });

  // implements FR-5, NFR-2 of password-recovery
  it.each<[string, Response, string]>([
    [
      "short",
      { validationErrors: { formErrors: [], fieldErrors: { password: ["Не менее 12 символов."] } } },
      "Не менее 12 символов.",
    ],
    ["weak", { data: { status: "failed", failure: "weak-password" } }, "Придумайте пароль надёжнее."],
    [
      "repeated",
      { data: { status: "failed", failure: "same-password" } },
      "Новый пароль должен отличаться от прежнего.",
    ],
  ])("shows the %s password's message under the field, wired to it", async (_label, response, message) => {
    answer(response);
    render(<ResetPasswordForm />);

    await submit("abc");

    await waitFor(() => expect(field()).toHaveAttribute("aria-invalid", "true"));
    expect(field()).toHaveAccessibleDescription(message);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-8 of password-recovery
  it.each<[string, Response, string]>([
    ["the limit", { data: { status: "failed", failure: "rate-limited" } }, RATE_LIMITED_MESSAGE],
    ["a missing config", { data: { status: "failed", failure: "unavailable" } }, "Восстановление пароля сейчас недоступно."],
    ["any other failure", { data: { status: "failed", failure: "unknown" } }, GENERIC_MESSAGE],
    ["a serverError", { serverError: "boom" }, GENERIC_MESSAGE],
  ])("shows %s in an alert above the form and keeps the form", async (_label, response, message) => {
    answer(response);
    render(<ResetPasswordForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(submitButton()).toBeEnabled();
  });

  // implements FR-8 of password-recovery
  it("clears the password field after a failed submit", async () => {
    answer({ data: { status: "failed", failure: "unknown" } });
    render(<ResetPasswordForm />);

    await submit();

    await screen.findByRole("alert");
    expect(field()).toHaveValue("");
  });

  // implements FR-8 of password-recovery
  it("replaces the form with the alert and the link to sign-in when the session ended", async () => {
    answer({ data: { status: "failed", failure: "link-expired" } });
    render(<ResetPasswordForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Ссылка для восстановления устарела. Запросите новое письмо.");
    expect(screen.getByRole("link", { name: BACK_TO_SIGN_IN_LABEL })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText(NEW_PASSWORD_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: NEW_PASSWORD_SUBMIT_LABEL })).not.toBeInTheDocument();
  });

  // implements FR-7 of password-recovery
  it("disables the field and the button while pending and calls the action once for a second click", async () => {
    // Settled at the end: React entangles async actions, so one that never ends would stall the next test's.
    let settle: (response: Response) => void = () => {};
    vi.mocked(updatePasswordAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(<ResetPasswordForm />);

    await submit();

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(field()).toBeDisabled();
    expect(field().closest("form")).toHaveAttribute("aria-busy", "true");
    await userEvent.click(submitButton());
    expect(updatePasswordAction).toHaveBeenCalledTimes(1);
    settle({ data: { status: "failed", failure: "unknown" } });
    await screen.findByRole("alert");
  });

  // implements FR-7 of password-recovery
  it.each([
    ["offline", CONNECTION_NOTICE_MESSAGES.offline],
    ["slow", CONNECTION_NOTICE_MESSAGES.slow],
  ] as const)("disables the field and the button and shows the notice when %s", (status, message) => {
    connection.status = status;

    render(<ResetPasswordForm />);

    expect(field()).toBeDisabled();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  // implements FR-7 of password-recovery
  it("enables the form again when the connection returns", () => {
    connection.status = "offline";
    const { rerender } = render(<ResetPasswordForm />);
    expect(submitButton()).toBeDisabled();

    connection.status = "online";
    rerender(<ResetPasswordForm />);

    expect(field()).toBeEnabled();
    expect(submitButton()).toBeEnabled();
    expect(screen.queryByText(CONNECTION_NOTICE_MESSAGES.offline)).not.toBeInTheDocument();
  });
});

describe("ResetPasswordForm focus after a failed save", () => {
  // implements NFR-2 of password-recovery
  it.each<[string, Response]>([
    ["a field error", { data: { status: "failed", failure: "weak-password" } }],
    ["a form failure", { data: { status: "failed", failure: "unknown" } }],
  ])("returns the focus to the password field after %s", async (_label, response) => {
    answer(response);
    render(<ResetPasswordForm />);

    await submit();

    await waitFor(() => expect(field()).toHaveFocus());
  });
});
