import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requestRecoveryAction, signInAction } from "../../actions/auth.actions";
import { GoogleSignInButton } from "../../components/GoogleSignInButton/GoogleSignInButton";
import { SignInForm } from "../../components/SignInForm/SignInForm";
import {
  GOOGLE_CONNECTION_MESSAGES,
  RECOVERY_FAILED_MESSAGE,
  RECOVERY_OFFER_BUTTON_LABEL,
  RECOVERY_OFFER_TEXT,
  RECOVERY_SENT_MESSAGE,
} from "../../model/auth-messages";
import type { AuthFailure } from "../../model/auth.types";
import { CONNECTION_NOTICE_MESSAGES } from "@/shared/ui/ui-messages";

vi.mock("../../actions/auth.actions", () => ({
  signInAction: vi.fn(),
  requestRecoveryAction: vi.fn(),
  startGoogleSignInAction: vi.fn(),
}));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "slow" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

type SignInResponse = Awaited<ReturnType<typeof signInAction>>;
type RecoveryResponse = Awaited<ReturnType<typeof requestRecoveryAction>>;

const EMAIL = "reader@example.com";
const OTHER_EMAIL = "someone-else@example.com";
const PASSWORD = "secret-password-1";
const WRONG_CREDENTIALS_MESSAGE = "Неверный адрес электронной почты или пароль.";
const RATE_LIMITED_MESSAGE = "Слишком много попыток. Попробуйте через несколько минут.";
const GENERIC_MESSAGE = "Что-то пошло не так. Попробуйте ещё раз.";

function wrongCredentials(): SignInResponse {
  return { data: { status: "failed", failure: "invalid-credentials" } };
}

function recoveryAnswer(answer: RecoveryResponse): void {
  vi.mocked(requestRecoveryAction).mockResolvedValue(answer);
}

async function signInWith(email = EMAIL, password = PASSWORD): Promise<void> {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Электронная почта"));
  await user.type(screen.getByLabelText("Электронная почта"), email);
  await user.type(screen.getByLabelText("Пароль"), password);
  await user.click(screen.getByRole("button", { name: "Войти" }));
}

function offerButton(): HTMLElement {
  return screen.getByRole("button", { name: RECOVERY_OFFER_BUTTON_LABEL });
}

async function renderWithOffer(email = EMAIL): Promise<void> {
  vi.mocked(signInAction).mockResolvedValue(wrongCredentials());
  render(<SignInForm />);
  await signInWith(email);
  await screen.findByText(RECOVERY_OFFER_TEXT);
}

afterEach(() => {
  vi.clearAllMocks();
  connection.status = "online";
});

describe("SignInForm: the recovery offer", () => {
  // implements FR-1 of password-recovery
  it("shows the offer and its button under the wrong-credentials alert", async () => {
    await renderWithOffer();

    expect(screen.getByRole("alert")).toHaveTextContent(WRONG_CREDENTIALS_MESSAGE);
    expect(screen.getByText(RECOVERY_OFFER_TEXT)).toBeInTheDocument();
    expect(offerButton()).toBeEnabled();
  });

  // implements FR-1 of password-recovery
  it("renders the same alert and offer whatever address was typed", async () => {
    await renderWithOffer(EMAIL);
    const first = screen.getByRole("alert").closest("form")?.textContent;
    vi.clearAllMocks();
    document.body.innerHTML = "";

    await renderWithOffer(OTHER_EMAIL);
    const second = screen.getByRole("alert").closest("form")?.textContent;

    expect(second).toBe(first);
  });

  // implements FR-1 of password-recovery
  it("shows no offer and no button on a fresh form", () => {
    render(<SignInForm />);

    expect(screen.queryByText(RECOVERY_OFFER_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: RECOVERY_OFFER_BUTTON_LABEL })).not.toBeInTheDocument();
  });

  // implements FR-1 of password-recovery
  it.each<AuthFailure>(["email-not-confirmed", "restricted", "rate-limited", "unavailable", "unknown"])(
    "shows no offer after the %s failure",
    async (failure) => {
      vi.mocked(signInAction).mockResolvedValue({ data: { status: "failed", failure } });
      render(<SignInForm />);

      await signInWith();

      await screen.findByRole("alert");
      expect(screen.queryByText(RECOVERY_OFFER_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: RECOVERY_OFFER_BUTTON_LABEL })).not.toBeInTheDocument();
    },
  );

  // implements FR-1, FR-3 of password-recovery
  it("shows the recovery-failed alert and the offer on load, and drops both at the first sign-in", async () => {
    vi.mocked(signInAction).mockResolvedValue({ data: { status: "failed", failure: "rate-limited" } });
    render(<SignInForm initialError={RECOVERY_FAILED_MESSAGE} offerOnLoad />);

    expect(screen.getByRole("alert")).toHaveTextContent(RECOVERY_FAILED_MESSAGE);
    expect(offerButton()).toBeInTheDocument();

    await signInWith();

    expect(await screen.findByText(RATE_LIMITED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(RECOVERY_FAILED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: RECOVERY_OFFER_BUTTON_LABEL })).not.toBeInTheDocument();
  });
});

describe("SignInForm: asking for a letter", () => {
  // implements FR-2 of password-recovery
  it("sends the address only, never the password", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer();

    await userEvent.click(offerButton());

    await screen.findByRole("status");
    expect(requestRecoveryAction).toHaveBeenCalledExactlyOnceWith({ email: EMAIL });
  });

  // implements FR-2, NFR-2 of password-recovery
  it("shows the sent notice as a live region in the alert slot, hides the offer text and keeps the button and address", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer();

    await userEvent.click(offerButton());

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(RECOVERY_SENT_MESSAGE);
    expect(RECOVERY_SENT_MESSAGE).toContain("1 час");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(RECOVERY_OFFER_TEXT)).not.toBeInTheDocument();
    expect(offerButton()).toBeEnabled();
    expect(screen.getByLabelText("Электронная почта")).toHaveValue(EMAIL);
  });

  // implements FR-2 of password-recovery
  it("asks again when the button is pressed after a sent notice", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer();

    await userEvent.click(offerButton());
    await screen.findByRole("status");
    await userEvent.click(offerButton());

    await waitFor(() => expect(requestRecoveryAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent(RECOVERY_SENT_MESSAGE);
  });

  // implements FR-2 of password-recovery
  it("sends the address typed after the offer appeared", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Электронная почта"));
    await user.type(screen.getByLabelText("Электронная почта"), OTHER_EMAIL);

    await user.click(offerButton());

    await screen.findByRole("status");
    expect(requestRecoveryAction).toHaveBeenCalledExactlyOnceWith({ email: OTHER_EMAIL });
  });

  // implements FR-2 of password-recovery
  it("shows the invalid-address message under the email field, wired to it, and returns focus there", async () => {
    recoveryAnswer({
      validationErrors: { formErrors: [], fieldErrors: { email: ["Введите корректный адрес электронной почты."] } },
    });
    await renderWithOffer("not-an-email");

    await userEvent.click(offerButton());

    const email = screen.getByLabelText("Электронная почта");
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    expect(email).toHaveAccessibleDescription("Введите корректный адрес электронной почты.");
    expect(email).toHaveFocus();
    expect(email).toHaveValue("not-an-email");
  });

  // implements FR-2 of password-recovery
  it.each<[string, RecoveryResponse, string]>([
    ["rate-limited", { data: { status: "failed", failure: "rate-limited" } }, RATE_LIMITED_MESSAGE],
    ["unavailable", { data: { status: "failed", failure: "unavailable" } }, "Восстановление пароля сейчас недоступно."],
    ["unknown", { data: { status: "failed", failure: "unknown" } }, GENERIC_MESSAGE],
    ["a serverError", { serverError: "boom" }, GENERIC_MESSAGE],
  ])("shows the %s failure in the alert slot and keeps the offer and the address", async (_label, answer, message) => {
    recoveryAnswer(answer);
    await renderWithOffer();

    await userEvent.click(offerButton());

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
    expect(screen.queryByText(WRONG_CREDENTIALS_MESSAGE)).not.toBeInTheDocument();
    expect(offerButton()).toBeEnabled();
    expect(screen.getByLabelText("Электронная почта")).toHaveValue(EMAIL);
  });

  // implements FR-2 of password-recovery
  it("gives the same notice for any address the action answers sent for", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer(EMAIL);
    await userEvent.click(offerButton());
    const first = (await screen.findByRole("status")).textContent;
    document.body.innerHTML = "";

    await renderWithOffer(OTHER_EMAIL);
    await userEvent.click(offerButton());
    const second = (await screen.findByRole("status")).textContent;

    expect(second).toBe(first);
  });

  // implements FR-2 of password-recovery
  it("drops a sent notice at the next sign-in attempt, leaving only the sign-in result", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer();
    await userEvent.click(offerButton());
    await screen.findByRole("status");

    await userEvent.type(screen.getByLabelText("Пароль"), PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(WRONG_CREDENTIALS_MESSAGE);
  });

  // implements NFR-1 of password-recovery
  it("navigates nowhere and puts the address in no link", async () => {
    recoveryAnswer({ data: { status: "sent" } });
    await renderWithOffer();

    await userEvent.click(offerButton());

    await screen.findByRole("status");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain(EMAIL);
    }
    expect(window.location.search).toBe("");
  });
});

describe("SignInForm: pending and offline", () => {
  // implements FR-7 of password-recovery
  it("disables both buttons while a recovery request is pending and sends a second click nowhere", async () => {
    // Settled at the end: React entangles async actions, so one that never ends would stall the next test's.
    let settle: (answer: RecoveryResponse) => void = () => {};
    vi.mocked(requestRecoveryAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));
    await renderWithOffer();

    await userEvent.click(offerButton());

    await waitFor(() => expect(offerButton()).toBeDisabled());
    expect(screen.getByRole("button", { name: "Войти" })).toBeDisabled();
    await userEvent.click(offerButton());
    expect(requestRecoveryAction).toHaveBeenCalledTimes(1);
    settle({ data: { status: "sent" } });
    await screen.findByRole("status");
  });

  // implements FR-7 of password-recovery
  it("disables both buttons while a sign-in is pending", async () => {
    await renderWithOffer();
    let settle: (response: SignInResponse) => void = () => {};
    vi.mocked(signInAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));

    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Войти" })).toBeDisabled());
    expect(offerButton()).toBeDisabled();
    settle({ data: { status: "failed", failure: "unknown" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled());
  });

  // implements FR-7 of password-recovery
  it.each([
    ["offline", CONNECTION_NOTICE_MESSAGES.offline],
    ["slow", CONNECTION_NOTICE_MESSAGES.slow],
  ] as const)("disables the offer's button and shows its own notice when %s", (status, message) => {
    connection.status = status;

    render(<SignInForm initialError={RECOVERY_FAILED_MESSAGE} offerOnLoad />);

    expect(offerButton()).toBeDisabled();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled();
  });

  // implements FR-7 of password-recovery
  it("shows a standard notice above the offer's button and leaves the Google notice unchanged", () => {
    connection.status = "offline";

    render(
      <>
        <SignInForm initialError={RECOVERY_FAILED_MESSAGE} offerOnLoad />
        <GoogleSignInButton from="sign-in" />
      </>,
    );

    const offerNotice = screen.getByText(CONNECTION_NOTICE_MESSAGES.offline);
    const googleNotice = screen.getByText(GOOGLE_CONNECTION_MESSAGES.offline);
    expect(offerNotice.compareDocumentPosition(offerButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(googleNotice).not.toBe(offerNotice);
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  // implements FR-7 of password-recovery
  it("enables the button again when the connection returns", () => {
    connection.status = "offline";
    const { rerender } = render(<SignInForm initialError={RECOVERY_FAILED_MESSAGE} offerOnLoad />);
    expect(offerButton()).toBeDisabled();

    connection.status = "online";
    rerender(<SignInForm initialError={RECOVERY_FAILED_MESSAGE} offerOnLoad />);

    expect(offerButton()).toBeEnabled();
    expect(screen.queryByText(CONNECTION_NOTICE_MESSAGES.offline)).not.toBeInTheDocument();
  });
});
