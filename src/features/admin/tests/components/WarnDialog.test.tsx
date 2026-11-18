import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { sendWarningAction } from "../../actions/send-warning.actions";
import { WarnDialog } from "../../components/WarnDialog/WarnDialog";
import type { WarnDialogProps } from "../../components/WarnDialog/WarnDialog.types";
import { CASE_FAILURE_MESSAGES, WARN_DIALOG_COPY } from "../../model/admin-messages";
import { WARNING_MESSAGE_MAX_LENGTH } from "../../model/violation.constants";
import type { SendWarningActionResult } from "../../model/violation.types";

vi.mock("../../actions/send-warning.actions", () => ({ sendWarningAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

stubModalDialog();

beforeEach(() => {
  connection.status = "online";
});
afterEach(() => vi.clearAllMocks());

const CASE_ID = "5c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const EMAIL = "anna.lis@example.com";
const MESSAGE = "Здравствуйте! Ваше произведение нарушает правила сайта.";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";

const onSettled = vi.fn();
const onClose = vi.fn();

type Response = Awaited<ReturnType<typeof sendWarningAction>>;
const respond = (result: SendWarningActionResult): Response => ({ data: result }) as Response;

function Host(overrides: Partial<WarnDialogProps>) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}>
        open
      </button>
      <WarnDialog
        dialogRef={ref}
        caseId={CASE_ID}
        email={EMAIL}
        onSettled={onSettled}
        onClose={onClose}
        {...overrides}
      />
    </>
  );
}

async function openDialog() {
  render(<Host />);
  await userEvent.click(screen.getByRole("button", { name: "open" }));
  return screen.getByRole("dialog");
}

const messageField = () => screen.getByLabelText(WARN_DIALOG_COPY.messageLabel);
const sendButton = () => screen.getByRole("button", { name: WARN_DIALOG_COPY.send });

async function typeAndSend(message = MESSAGE) {
  await userEvent.type(messageField(), message);
  await userEvent.click(sendButton());
}

describe("WarnDialog", () => {
  // implements FR-6 of admin-violations-feedback
  it("shows the address read-only, an empty message field and the limit as a hint", async () => {
    const dialog = await openDialog();

    expect(within(dialog).getByRole("heading", { name: WARN_DIALOG_COPY.title })).toBeInTheDocument();
    const address = screen.getByLabelText(WARN_DIALOG_COPY.toLabel);
    expect(address).toHaveValue(EMAIL);
    expect(address).toHaveAttribute("readonly");
    expect(messageField()).toHaveValue("");
    expect(messageField()).not.toHaveAttribute("readonly");
    expect(within(dialog).getByText(WARN_DIALOG_COPY.hint)).toBeInTheDocument();
  });

  // implements FR-6 of admin-violations-feedback
  it.each(["", "   "])("refuses the message %j with a field error and calls no action", async (message) => {
    await openDialog();

    if (message !== "") await userEvent.type(messageField(), message);
    await userEvent.click(sendButton());

    expect(screen.getByText(WARN_DIALOG_COPY.emptyError)).toBeInTheDocument();
    expect(messageField()).toBeInvalid();
    expect(screen.queryByText(WARN_DIALOG_COPY.hint)).not.toBeInTheDocument();
    expect(sendWarningAction).not.toHaveBeenCalled();
  });

  // implements FR-6 of admin-violations-feedback
  it("refuses a message over the limit with its own error, and clears the error when the text changes", async () => {
    await openDialog();
    fireEvent.change(messageField(), { target: { value: "а".repeat(WARNING_MESSAGE_MAX_LENGTH + 1) } });

    await userEvent.click(sendButton());
    expect(screen.getByText(WARN_DIALOG_COPY.tooLongError)).toBeInTheDocument();
    expect(sendWarningAction).not.toHaveBeenCalled();

    fireEvent.change(messageField(), { target: { value: MESSAGE } });
    expect(screen.queryByText(WARN_DIALOG_COPY.tooLongError)).not.toBeInTheDocument();
  });

  // implements FR-6 of admin-violations-feedback
  it("sends the message for this case, closes, and tells the row the warning went out", async () => {
    vi.mocked(sendWarningAction).mockResolvedValue(respond({ ok: true }));
    const dialog = await openDialog();

    await typeAndSend();

    expect(sendWarningAction).toHaveBeenCalledExactlyOnceWith({ caseId: CASE_ID, message: MESSAGE });
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(onSettled).toHaveBeenCalledExactlyOnceWith({ kind: "sent" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // implements FR-11 of admin-violations-feedback
  it.each([
    ["a timeout", { ok: false, reason: "email-failed", cause: "timeout", outcomeUnknown: true }],
    ["a missing answer", undefined],
  ] as const)("fixes the text after %s, so a retry carries the same one", async (_case, answer) => {
    if (answer === undefined) vi.mocked(sendWarningAction).mockResolvedValueOnce({} as Response);
    else vi.mocked(sendWarningAction).mockResolvedValueOnce(respond(answer));
    vi.mocked(sendWarningAction).mockResolvedValueOnce(respond({ ok: true }));
    const dialog = await openDialog();

    await typeAndSend();

    expect(await within(dialog).findByText(WARN_DIALOG_COPY.unknownOutcome)).toBeInTheDocument();
    expect(messageField()).toHaveAttribute("readonly");
    expect(messageField()).toHaveValue(MESSAGE);
    expect(dialog).toHaveAttribute("open");
    expect(onSettled).not.toHaveBeenCalled();

    await userEvent.click(sendButton());

    await waitFor(() => expect(sendWarningAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(sendWarningAction).mock.calls[1]).toEqual([{ caseId: CASE_ID, message: MESSAGE }]);
    await waitFor(() => expect(onSettled).toHaveBeenCalledExactlyOnceWith({ kind: "sent" }));
  });

  // implements FR-11 of admin-violations-feedback
  it.each([
    ["missing email settings", "config", WARN_DIALOG_COPY.notConfigured],
    ["a refusal by the email service", "http", WARN_DIALOG_COPY.notSent],
  ] as const)("keeps the text editable after %s", async (_case, cause, text) => {
    vi.mocked(sendWarningAction).mockResolvedValue(
      respond({ ok: false, reason: "email-failed", cause, outcomeUnknown: false }),
    );
    const dialog = await openDialog();

    await typeAndSend();

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(text);
    expect(messageField()).not.toHaveAttribute("readonly");
    expect(messageField()).toHaveValue(MESSAGE);
    expect(dialog).toHaveAttribute("open");
  });

  // implements FR-11 of admin-violations-feedback
  it("starts the next opening with an empty, editable field after the lock", async () => {
    vi.mocked(sendWarningAction).mockResolvedValue(
      respond({ ok: false, reason: "email-failed", cause: "network", outcomeUnknown: true }),
    );
    const dialog = await openDialog();
    await typeAndSend();
    expect(await within(dialog).findByText(WARN_DIALOG_COPY.unknownOutcome)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: WARN_DIALOG_COPY.cancel }));
    await userEvent.click(screen.getByRole("button", { name: "open" }));

    expect(messageField()).toHaveValue("");
    expect(messageField()).not.toHaveAttribute("readonly");
    expect(within(dialog).queryByText(WARN_DIALOG_COPY.unknownOutcome)).not.toBeInTheDocument();
    expect(onSettled).not.toHaveBeenCalled();
  });

  // implements FR-11 of admin-violations-feedback
  it.each([
    ["already-warned"],
    ["wrong-ground"],
    ["case-not-found"],
    ["already-restricted"],
  ] as const)("closes and tells the row the case stopped with %s", async (reason) => {
    vi.mocked(sendWarningAction).mockResolvedValue(respond({ ok: false, reason }));
    const dialog = await openDialog();

    await typeAndSend();

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(onSettled).toHaveBeenCalledExactlyOnceWith({ kind: "stopped", reason });
  });

  // implements FR-15 of admin-violations-feedback
  it.each([
    ["unauthenticated", CASE_FAILURE_MESSAGES.unauthenticated],
    ["forbidden", CASE_FAILURE_MESSAGES.forbidden],
    ["no-address", WARN_DIALOG_COPY.noAddress],
  ] as const)("shows %s in the dialog and keeps the text editable", async (reason, text) => {
    vi.mocked(sendWarningAction).mockResolvedValue(respond({ ok: false, reason }));
    const dialog = await openDialog();

    await typeAndSend();

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(text);
    expect(messageField()).not.toHaveAttribute("readonly");
    expect(dialog).toHaveAttribute("open");
  });

  // implements FR-11 of admin-violations-feedback
  it("sends once for a second click before the dialog disables, and cannot be closed while it runs", async () => {
    let settle: (value: Response) => void = () => undefined;
    vi.mocked(sendWarningAction).mockReturnValue(new Promise<Response>((resolve) => (settle = resolve)));
    const dialog = await openDialog();
    await userEvent.type(messageField(), MESSAGE);

    fireEvent.click(sendButton());
    fireEvent.click(sendButton());

    expect(sendWarningAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(sendButton()).toBeDisabled());
    expect(within(dialog).getByRole("button", { name: WARN_DIALOG_COPY.cancel })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: WARN_DIALOG_COPY.close })).toBeDisabled();
    expect(messageField()).toBeDisabled();
    // An unsettled async transition would keep every later test's transitions pending.
    await act(async () => settle(respond({ ok: true })));
  });

  // implements FR-15 of admin-violations-feedback
  it("says there is no connection and disables «Отправить» offline, keeping the text", async () => {
    connection.status = "offline";
    const dialog = await openDialog();

    expect(within(dialog).getByText(OFFLINE_TEXT)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
    await userEvent.type(messageField(), MESSAGE);
    expect(messageField()).toHaveValue(MESSAGE);
    expect(within(dialog).getByRole("button", { name: WARN_DIALOG_COPY.cancel })).toBeEnabled();
  });
});
