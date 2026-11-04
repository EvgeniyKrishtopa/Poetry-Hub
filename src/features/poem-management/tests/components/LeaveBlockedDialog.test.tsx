import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LeaveBlockedDialog } from "../../components/LeaveBlockedDialog/LeaveBlockedDialog";
import type { LeaveDialogReason } from "../../components/LeaveBlockedDialog/LeaveBlockedDialog.types";
import { LEAVE_DIALOG_REASON } from "../../model/poem-management.constants";

const TITLE = "Есть несохранённые изменения";
const LINK_BODY = "Сначала сохраните изменения.";
const SIGN_OUT_BODY = "Если выйти сейчас, изменения пропадут.";
const STAY = "Продолжить редактирование";
const LEAVE = "Выйти без сохранения";

// jsdom has no modal dialog: stand in for the parts the component relies on, as the browser does them.
const nativeShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterAll(() => {
  if (nativeShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", nativeShowModal);
  if (nativeClose) Object.defineProperty(HTMLDialogElement.prototype, "close", nativeClose);
});

function renderOpenDialog(reason: LeaveDialogReason) {
  const ref = createRef<HTMLDialogElement>();
  const stayRef = createRef<HTMLButtonElement>();
  const onStay = vi.fn();
  const onLeave = vi.fn();
  const onClose = vi.fn();
  render(
    <LeaveBlockedDialog
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

describe("LeaveBlockedDialog", () => {
  // implements FR-13 of edit-poem: the link form's copy and its one button
  it("shows the link form with the save-first text and one button", async () => {
    const { dialog, stayRef, onStay } = renderOpenDialog(LEAVE_DIALOG_REASON.link);

    expect(within(dialog).getByText(LINK_BODY)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: LEAVE })).toBeNull();
    const stay = within(dialog).getByRole("button", { name: STAY });
    expect(stayRef.current).toBe(stay);

    await userEvent.setup().click(stay);
    expect(onStay).toHaveBeenCalledOnce();
  });

  // implements FR-13 of edit-poem: the sign-out form's copy, its two buttons, and their order
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

  // implements FR-13 of edit-poem: the corner button closes it without an answer of its own
  it("closes from the corner button and reports the close", async () => {
    const { dialog, onClose, onLeave, onStay } = renderOpenDialog(LEAVE_DIALOG_REASON.signOut);

    await userEvent.setup().click(within(dialog).getByRole("button", { name: "Закрыть" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
    expect(onLeave).not.toHaveBeenCalled();
    expect(onStay).not.toHaveBeenCalled();
  });
});
