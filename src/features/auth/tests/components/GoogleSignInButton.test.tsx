import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { startGoogleSignInAction } from "../../actions/auth.actions";
import { GoogleSignInButton } from "../../components/GoogleSignInButton/GoogleSignInButton";
import {
  GOOGLE_BUTTON_LABEL,
  GOOGLE_CANCELLED_MESSAGE,
  GOOGLE_CONNECTION_MESSAGES,
  GOOGLE_FAILED_MESSAGE,
} from "../../model/auth-messages";

vi.mock("../../actions/auth.actions", () => ({ startGoogleSignInAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "slow" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

type StartResponse = Awaited<ReturnType<typeof startGoogleSignInAction>>;

const SIGN_IN_LABEL = GOOGLE_BUTTON_LABEL["sign-in"];
const FAILED_RESPONSE: StartResponse = { data: { status: "failed" } };

function getButton() {
  return screen.getByRole("button", { name: SIGN_IN_LABEL });
}

async function press() {
  await userEvent.click(getButton());
}

afterEach(() => {
  vi.clearAllMocks();
  connection.status = "online";
});

describe("GoogleSignInButton", () => {
  // implements FR-G1 of google-sign-in
  it.each([
    ["sign-in", "Войти через Google"],
    ["sign-up", "Зарегистрироваться через Google"],
  ] as const)("labels the button for the %s page and sends that origin", async (from, label) => {
    vi.mocked(startGoogleSignInAction).mockResolvedValue(FAILED_RESPONSE);
    render(<GoogleSignInButton from={from} />);

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(startGoogleSignInAction).toHaveBeenCalledExactlyOnceWith({ from });
  });

  // implements FR-G1 of google-sign-in
  it("is enabled online with no alert and no connection notice", () => {
    render(<GoogleSignInButton from="sign-in" />);

    expect(getButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // implements FR-G1 of google-sign-in
  it("shows the try-again alert after a failed start and keeps the button enabled", async () => {
    vi.mocked(startGoogleSignInAction).mockResolvedValue(FAILED_RESPONSE);
    render(<GoogleSignInButton from="sign-in" />);

    await press();

    expect(screen.getByRole("alert")).toHaveTextContent(GOOGLE_FAILED_MESSAGE);
    expect(getButton()).toBeEnabled();
  });

  // implements FR-G1 of google-sign-in: a server error or a rejected input is a failed start too
  it("shows the try-again alert when the action answers with a server error", async () => {
    vi.mocked(startGoogleSignInAction).mockResolvedValue({ serverError: "boom" });
    render(<GoogleSignInButton from="sign-in" />);

    await press();

    expect(screen.getByRole("alert")).toHaveTextContent(GOOGLE_FAILED_MESSAGE);
  });

  // implements FR-G1 of google-sign-in: the connection drops between the press and the call
  it("shows the try-again alert when the call itself fails", async () => {
    vi.mocked(startGoogleSignInAction).mockRejectedValue(new TypeError("fetch failed"));
    render(<GoogleSignInButton from="sign-in" />);

    await press();

    expect(screen.getByRole("alert")).toHaveTextContent(GOOGLE_FAILED_MESSAGE);
    expect(getButton()).toBeEnabled();
  });

  // implements FR-G1, FR-G4 of google-sign-in
  it("shows the page's notice before the button is pressed", () => {
    render(<GoogleSignInButton from="sign-in" initialError={GOOGLE_CANCELLED_MESSAGE} />);

    expect(screen.getByRole("alert")).toHaveTextContent(GOOGLE_CANCELLED_MESSAGE);
  });

  // implements FR-G1 of google-sign-in
  it("replaces the page's notice with the failed start, leaving exactly one alert", async () => {
    vi.mocked(startGoogleSignInAction).mockResolvedValue(FAILED_RESPONSE);
    render(<GoogleSignInButton from="sign-in" initialError={GOOGLE_CANCELLED_MESSAGE} />);

    await press();

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(GOOGLE_FAILED_MESSAGE);
  });

  // implements FR-G1 of google-sign-in
  it("is disabled and busy while the start runs, and hides the page's notice", async () => {
    let finish: (response: StartResponse) => void = () => {};
    vi.mocked(startGoogleSignInAction).mockReturnValue(new Promise<StartResponse>((resolve) => (finish = resolve)));
    render(<GoogleSignInButton from="sign-in" initialError={GOOGLE_CANCELLED_MESSAGE} />);

    await press();

    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await act(async () => finish(FAILED_RESPONSE));

    expect(getButton()).toBeEnabled();
    expect(getButton()).toHaveAttribute("aria-busy", "false");
  });

  // implements FR-G1 of google-sign-in: a retry clears the earlier failure until its own result arrives
  it("hides the earlier failure while a retry runs", async () => {
    vi.mocked(startGoogleSignInAction).mockResolvedValueOnce(FAILED_RESPONSE);
    render(<GoogleSignInButton from="sign-in" />);
    await press();
    expect(screen.getByRole("alert")).toHaveTextContent(GOOGLE_FAILED_MESSAGE);

    let finish: (response: StartResponse) => void = () => {};
    vi.mocked(startGoogleSignInAction).mockReturnValueOnce(new Promise<StartResponse>((resolve) => (finish = resolve)));
    await press();

    expect(getButton()).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await act(async () => finish(FAILED_RESPONSE));

    expect(screen.getByRole("alert")).toHaveTextContent(GOOGLE_FAILED_MESSAGE);
  });

  // implements FR-G2 of google-sign-in
  it.each([
    ["offline", GOOGLE_CONNECTION_MESSAGES.offline],
    ["slow", GOOGLE_CONNECTION_MESSAGES.slow],
  ] as const)("is disabled %s with the Google connection notice above it, and starts nothing", async (status, text) => {
    connection.status = status;
    render(<GoogleSignInButton from="sign-in" />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(text);
    expect(notice.compareDocumentPosition(getButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getButton()).toBeDisabled();

    await press();

    expect(startGoogleSignInAction).not.toHaveBeenCalled();
  });

  // implements FR-G2 of google-sign-in
  it("keeps the page's notice above the connection notice while offline", () => {
    connection.status = "offline";
    render(<GoogleSignInButton from="sign-in" initialError={GOOGLE_CANCELLED_MESSAGE} />);

    const alert = screen.getByRole("alert");
    const notice = screen.getByRole("status");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(alert.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // implements FR-G2 of google-sign-in
  it("hides the notice and enables the button when the connection comes back", () => {
    connection.status = "offline";
    const { rerender } = render(<GoogleSignInButton from="sign-in" />);
    expect(getButton()).toBeDisabled();

    connection.status = "online";
    rerender(<GoogleSignInButton from="sign-in" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(getButton()).toBeEnabled();
  });
});
