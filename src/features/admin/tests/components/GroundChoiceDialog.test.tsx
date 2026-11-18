import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { GroundChoiceDialog } from "../../components/GroundChoiceDialog/GroundChoiceDialog";
import type { GroundChoiceDialogProps } from "../../components/GroundChoiceDialog/GroundChoiceDialog.types";
import { CASE_FAILURE_MESSAGES, CONTENT_GONE_MESSAGES, GROUND_CHOICE_COPY, GROUND_COPY } from "../../model/admin-messages";

stubModalDialog();
afterEach(() => vi.clearAllMocks());

const onConfirm = vi.fn();
const onClose = vi.fn();
const EMAIL = "anna.lis@example.com";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";

type Overrides = Partial<Omit<GroundChoiceDialogProps, "dialogRef">>;

function Host(overrides: Overrides) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}>
        open
      </button>
      <GroundChoiceDialog
        dialogRef={ref}
        subject={EMAIL}
        isPending={false}
        connectionStatus="online"
        failure={null}
        content={null}
        onConfirm={onConfirm}
        onClose={onClose}
        {...overrides}
      />
    </>
  );
}

async function renderOpen(overrides: Overrides = {}) {
  render(<Host {...overrides} />);
  await userEvent.click(screen.getByRole("button", { name: "open" }));
  return screen.getByRole("dialog");
}

const radio = (ground: "harmful-content" | "malicious-activity") =>
  screen.getByRole("radio", { name: new RegExp(GROUND_COPY[ground].label) });

describe("GroundChoiceDialog", () => {
  // implements FR-1 of admin-violations-feedback
  it("names who is added, offers both grounds and preselects «Вредный текст»", async () => {
    const dialog = await renderOpen();

    expect(within(dialog).getByRole("heading", { name: GROUND_CHOICE_COPY.title })).toBeInTheDocument();
    expect(within(dialog).getByText(GROUND_CHOICE_COPY.description(EMAIL))).toBeInTheDocument();
    expect(radio("harmful-content")).toBeChecked();
    expect(radio("malicious-activity")).not.toBeChecked();
    expect(within(dialog).getByText(GROUND_COPY["malicious-activity"].description)).toBeInTheDocument();
  });

  // implements FR-1 of admin-violations-feedback
  it("confirms with the ground the admin picked", async () => {
    await renderOpen();

    await userEvent.click(radio("malicious-activity"));
    await userEvent.click(screen.getByRole("button", { name: GROUND_CHOICE_COPY.confirm }));

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("malicious-activity");
  });

  // implements FR-1 of admin-violations-feedback
  it("confirms the preselected ground when the admin only presses «Добавить»", async () => {
    await renderOpen();

    await userEvent.click(screen.getByRole("button", { name: GROUND_CHOICE_COPY.confirm }));

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("harmful-content");
  });

  // implements FR-3 of admin-violations-feedback
  it("adds nobody when cancelled, and starts the next opening from the default ground", async () => {
    const dialog = await renderOpen();
    await userEvent.click(radio("malicious-activity"));

    await userEvent.click(within(dialog).getByRole("button", { name: GROUND_CHOICE_COPY.cancel }));
    await userEvent.click(screen.getByRole("button", { name: "open" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(radio("harmful-content")).toBeChecked();
  });

  // implements FR-2 of admin-violations-feedback
  it.each([
    ["poem", GROUND_CHOICE_COPY.contentNote.poem("Осенний сад")],
    ["collection", GROUND_CHOICE_COPY.contentNote.collection("Осенний сад")],
  ] as const)("notes the %s that prompted the case, by its title", async (kind, note) => {
    await renderOpen({ content: { kind, id: "30000000-0000-4000-8000-000000000021", title: "Осенний сад" } });

    expect(screen.getByText(note)).toBeInTheDocument();
  });

  // implements FR-2 of admin-violations-feedback
  it("notes nothing without content", async () => {
    await renderOpen();

    expect(screen.queryByText(/будет записан/)).not.toBeInTheDocument();
  });

  // implements FR-15 of admin-violations-feedback
  it("shows a failure above the buttons and keeps the dialog open", async () => {
    const dialog = await renderOpen({ failure: "target-is-admin" });

    expect(within(dialog).getByRole("alert")).toHaveTextContent(CASE_FAILURE_MESSAGES["target-is-admin"]);
    expect(dialog).toHaveAttribute("open");
  });

  // implements FR-15 of admin-violations-feedback
  it.each([
    ["poem", CONTENT_GONE_MESSAGES.poem],
    ["collection", CONTENT_GONE_MESSAGES.collection],
  ] as const)("words a deleted %s as a failure of its own", async (kind, text) => {
    const dialog = await renderOpen({
      failure: "content-not-found",
      content: { kind, id: "30000000-0000-4000-8000-000000000021", title: "Осенний сад" },
    });

    expect(within(dialog).getByRole("alert")).toHaveTextContent(text);
  });

  // implements FR-15 of admin-violations-feedback
  it("cannot be closed or changed while the add is running", async () => {
    const dialog = await renderOpen({ isPending: true });

    expect(within(dialog).getByRole("button", { name: GROUND_CHOICE_COPY.cancel })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: GROUND_CHOICE_COPY.close })).toBeDisabled();
    expect(screen.getByRole("button", { name: GROUND_CHOICE_COPY.confirm })).toBeDisabled();
    expect(radio("harmful-content")).toBeDisabled();
    expect(radio("malicious-activity")).toBeDisabled();
  });

  // implements FR-15 of admin-violations-feedback
  it("says there is no connection and disables «Добавить» offline", async () => {
    const dialog = await renderOpen({ connectionStatus: "offline" });

    expect(within(dialog).getByText(OFFLINE_TEXT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GROUND_CHOICE_COPY.confirm })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: GROUND_CHOICE_COPY.cancel })).toBeEnabled();
  });
});
