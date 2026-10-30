"use client";

import { useId, useRef, type MouseEvent, type PointerEvent, type SyntheticEvent } from "react";

import styles from "./Dialog.module.css";
import type { DialogProps } from "./Dialog.types";

// Preflight clears the native dialog's margin, so `m-auto` re-centres it; the width keeps a 16 px gutter.
const DIALOG_CLASS = `${styles.dialog} m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-background p-0 text-foreground`;

const CLOSE_BUTTON_CLASS =
  "absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

/** The corner close button's visible mark; its accessible name is `closeLabel`. */
const CLOSE_GLYPH = "×";

/**
 * A native modal dialog with a heading, an optional description, and a corner close button; a click on the
 * backdrop closes it too. The caller opens it through `ref` (add-contact-form design D6). With
 * `closable={false}` it stays open until the caller allows closing again (delete-poem design D7).
 */
export function Dialog({ ref, title, description, closeLabel, onClose, closable = true, children }: DialogProps) {
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  // Shared by the corner button and the backdrop.
  function close() {
    if (closable) ref.current?.close();
  }

  // Escape fires `cancel` before closing.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (!closable) event.preventDefault();
  }

  // Chromium can make a second Escape without user activation uncancelable, so a close can still happen;
  // re-opening at once keeps the dialog up while a request runs (delete-poem design D7, Gate 1 P7).
  function handleClose(event: SyntheticEvent<HTMLDialogElement>) {
    const dialog = event.currentTarget;
    if (closable) {
      onClose?.();
      return;
    }
    if (dialog.isConnected && !dialog.open) dialog.showModal();
  }

  // The padding lives on the inner box, so only the backdrop targets the dialog itself. A drag that
  // starts inside (selecting typed text) and ends on the backdrop also clicks the dialog, so the press
  // must have started there too.
  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const closesDialog = pressStartedOnBackdrop.current && event.target === event.currentTarget;
    pressStartedOnBackdrop.current = false;
    if (closesDialog) close();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onCancel={handleCancel}
      onClose={handleClose}
      className={DIALOG_CLASS}
    >
      <div className="relative flex flex-col gap-4 p-5 min-[600px]:p-6">
        <div className="flex flex-col gap-1 pr-10">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          {description !== undefined && <p className="text-sm text-muted">{description}</p>}
        </div>
        {children}
        {/* Last in the DOM, drawn in the corner: the dialog reads heading first and opens with focus on
            the content's first field (add-contact-form, user decision 2026-10-23). */}
        <button
          type="button"
          aria-label={closeLabel}
          disabled={!closable}
          onClick={close}
          className={CLOSE_BUTTON_CLASS}
        >
          <span aria-hidden="true" className="text-[22px] leading-none">
            {CLOSE_GLYPH}
          </span>
        </button>
      </div>
    </dialog>
  );
}
