import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { CollectionLeaveDialog } from "../../components/CollectionLeaveDialog/CollectionLeaveDialog";
import { LEAVE_DIALOG_REASON } from "../../model/collection-management.constants";
import type { LeaveDialogReason } from "../../model/collection-management.types";

const TITLE = "Есть несохранённые изменения";
const LINK_BODY = "Сначала сохраните изменения.";
const SIGN_OUT_BODY = "Если выйти сейчас, изменения пропадут.";
const STAY = "Продолжить редактирование";
const LEAVE = "Выйти без сохранения";

stubModalDialog();

function renderOpenDialog(reason: LeaveDialogReason) {
  const ref = createRef<HTMLDialogElement>();
  const stayRef = createRef<HTMLButtonElement>();
  const onStay = vi.fn();
  const onLeave = vi.fn();
  const onClose = vi.fn();
  render(
    <CollectionLeaveDialog
      ref={ref}
      stayRef={stayRef}
      reason={reason}
      onStay={onStay}
      onLeave={onLeave}
      onClose={onClose}
    />,
  );
  ref.current?.showModal();
  const dialog = screen.getByRole("dialog", { name: TITLE });
  return { dialog, stayRef, onStay, onLeave, onClose };
}

// The poem dialog's tests, repeated for the feature's copy (design D12).
describe("CollectionLeaveDialog", () => {
  // implements FR-12 of add-poem-collections: the link form's copy and its one button
  it("shows the link form with the save-first text and one button", async () => {
    const { dialog, stayRef, onStay } = renderOpenDialog(LEAVE_DIALOG_REASON.link);

    expect(within(dialog).getByText(LINK_BODY)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: LEAVE })).toBeNull();
    const stay = within(dialog).getByRole("button", { name: STAY });
    expect(stayRef.current).toBe(stay);

    await userEvent.setup().click(stay);
    expect(onStay).toHaveBeenCalledOnce();
  });

  // implements FR-12 of add-poem-collections: the sign-out form's copy, its two buttons, and their order
  it("shows the sign-out form with leave first and stay second", async () => {
    const { dialog, stayRef, onStay, onLeave } = renderOpenDialog(LEAVE_DIALOG_REASON.signOut);
    const user = userEvent.setup();

    expect(within(dialog).getByText(SIGN_OUT_BODY)).toBeInTheDocument();
    const [leave, stay] = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.textContent === LEAVE || button.textContent === STAY);
    expect(leave).toHaveTextContent(LEAVE);
    expect(stay).toHaveTextContent(STAY);
    expect(stayRef.current).toBe(stay);

    await user.click(leave);
    expect(onLeave).toHaveBeenCalledOnce();
    await user.click(stay);
    expect(onStay).toHaveBeenCalledOnce();
  });

  // implements FR-12 of add-poem-collections: the corner button closes it without an answer of its own
  it("closes from the corner button and reports the close", async () => {
    const { dialog, onClose, onLeave, onStay } = renderOpenDialog(LEAVE_DIALOG_REASON.signOut);

    await userEvent.setup().click(within(dialog).getByRole("button", { name: "Закрыть" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
    expect(onLeave).not.toHaveBeenCalled();
    expect(onStay).not.toHaveBeenCalled();
  });
});
