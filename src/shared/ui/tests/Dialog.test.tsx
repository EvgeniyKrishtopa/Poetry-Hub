import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

/** An open dialog whose `closable` the test can flip, as a caller does around a request. */
function renderClosableDialog(closable: boolean) {
  const ref = createRef<HTMLDialogElement>();
  const onClose = vi.fn();
  const tree = (value: boolean) => (
    <Dialog ref={ref} title={TITLE} closeLabel={CLOSE_LABEL} onClose={onClose} closable={value}>
      <button type="button">{CONTENT_LABEL}</button>
    </Dialog>
  );
  const { rerender } = render(tree(closable));
  ref.current?.showModal();
  const dialog = screen.getByRole("dialog", { hidden: true });
  return {
    dialog,
    onClose,
    closeButton: within(dialog).getByRole("button", { name: CLOSE_LABEL }),
    close: () => ref.current?.close(),
    setClosable: (value: boolean) => rerender(tree(value)),
  };
}

/** Escape on a modal dialog: a cancelable `cancel` event, then a close unless it was prevented. */
function pressEscape(dialog: HTMLElement): boolean {
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  return cancel.defaultPrevented;
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

  // implements FR-2 of delete-poem: Escape and the backdrop still cancel when the dialog is closable
  it("lets Escape and a backdrop press close it while closable", () => {
    const { dialog, closeButton } = renderClosableDialog(true);

    expect(closeButton).toBeEnabled();
    expect(pressEscape(dialog)).toBe(false);

    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(dialog).not.toHaveAttribute("open");
  });

  describe("with closable={false}", () => {
    // implements FR-3 of delete-poem: the sending state's corner button and Escape
    it("disables the corner button and prevents Escape's cancel", () => {
      const { dialog, closeButton, onClose } = renderClosableDialog(false);

      expect(closeButton).toBeDisabled();
      expect(pressEscape(dialog)).toBe(true);
      expect(dialog).toHaveAttribute("open");
      expect(onClose).not.toHaveBeenCalled();
    });

    // implements FR-3 of delete-poem
    it("ignores a press on the backdrop", () => {
      const { dialog, onClose } = renderClosableDialog(false);

      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog);

      expect(dialog).toHaveAttribute("open");
      expect(onClose).not.toHaveBeenCalled();
    });

    // implements FR-3 of delete-poem: an uncancelable second Escape (Gate 1 P7)
    it("re-opens after a close that happens anyway, without reporting it", () => {
      vi.useFakeTimers();
      try {
        const { dialog, close, onClose } = renderClosableDialog(false);

        close();
        act(() => vi.runAllTimers());

        expect(dialog).toHaveAttribute("open");
        expect(onClose).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("closes through the caller and reports it once closable again", () => {
      const { dialog, close, onClose, setClosable } = renderClosableDialog(false);

      setClosable(true);
      close();

      expect(dialog).not.toHaveAttribute("open");
      expect(onClose).toHaveBeenCalledOnce();
    });

    // Gate 4 CR-01: allowing the close and closing in the same tick, before the re-render lands
    it("lets a caller's close stand when closable turns true before the deferred check", () => {
      vi.useFakeTimers();
      try {
        const { dialog, close, onClose, setClosable } = renderClosableDialog(false);

        close();
        setClosable(true);
        act(() => vi.runAllTimers());

        expect(dialog).not.toHaveAttribute("open");
        expect(onClose).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
