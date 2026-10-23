import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Dialog } from "../Dialog/Dialog";

const TITLE = "Title";
const DESCRIPTION = "Description";
const CLOSE_LABEL = "Close";
const CONTENT_LABEL = "Content";

// jsdom has no modal dialog: stand in for the parts the component relies on.
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

function renderOpenDialog(description?: string) {
  const ref = createRef<HTMLDialogElement>();
  const onClose = vi.fn();
  render(
    <Dialog ref={ref} title={TITLE} description={description} closeLabel={CLOSE_LABEL} onClose={onClose}>
      <button type="button">{CONTENT_LABEL}</button>
    </Dialog>,
  );
  ref.current?.showModal();
  const dialog = screen.getByRole("dialog", { hidden: true });
  return { dialog, onClose };
}

describe("Dialog", () => {
  it("is labelled by its heading and shows the description and content", () => {
    const { dialog } = renderOpenDialog(DESCRIPTION);

    expect(dialog).toHaveAccessibleName(TITLE);
    expect(within(dialog).getByRole("heading", { name: TITLE })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(DESCRIPTION);
    expect(within(dialog).getByRole("button", { name: CONTENT_LABEL })).toBeInTheDocument();
  });

  it("renders no description paragraph without one", () => {
    const { dialog } = renderOpenDialog();

    expect(dialog.querySelector("p")).toBeNull();
  });

  it("closes on the corner button, placed last, and reports the close", async () => {
    const { dialog, onClose } = renderOpenDialog();
    const buttons = within(dialog).getAllByRole("button");

    expect(buttons[buttons.length - 1]).toHaveAccessibleName(CLOSE_LABEL);
    await userEvent.click(buttons[buttons.length - 1]);

    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on a press that starts and ends on the backdrop", () => {
    const { dialog, onClose } = renderOpenDialog();

    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);

    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("stays open when a press starts inside and ends on the backdrop", () => {
    const { dialog, onClose } = renderOpenDialog();

    fireEvent.pointerDown(within(dialog).getByRole("heading", { name: TITLE }));
    fireEvent.click(dialog);

    expect(dialog).toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open on a click inside the content", async () => {
    const { dialog } = renderOpenDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: CONTENT_LABEL }));

    expect(dialog).toHaveAttribute("open");
  });
});
