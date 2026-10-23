"use client";

import { useId, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { CONTACT_COPY } from "../../model/contact-messages";
import { ContactForm } from "../ContactForm/ContactForm";

import styles from "./ContactDialog.module.css";
import type { ContactDialogProps } from "./ContactDialog.types";

// Preflight clears the native dialog's margin, so `m-auto` re-centres it; the width keeps a 16 px gutter.
const DIALOG_CLASS = `${styles.dialog} m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-background p-0 text-foreground`;

const CLOSE_BUTTON_CLASS =
  "absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent";

/** The footer's contact button and the native modal dialog it opens (design D6). */
export function ContactDialog({ triggerClassName }: ContactDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();
  // The form stays mounted while closed, so typed values and errors survive (FR-4); a new key after a
  // success remounts it empty, once the dialog has closed.
  const [formKey, setFormKey] = useState(0);
  const [sent, setSent] = useState(false);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  // The padding lives on the inner box, so only the backdrop targets the dialog itself. A drag that
  // starts inside (selecting typed text) and ends on the backdrop also clicks the dialog, so the press
  // must have started there too.
  function handleDialogPointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    const closesDialog = pressStartedOnBackdrop.current && event.target === event.currentTarget;
    pressStartedOnBackdrop.current = false;
    if (closesDialog) close();
  }

  function handleClosed() {
    if (!sent) return;
    setFormKey((key) => key + 1);
    setSent(false);
  }

  function handleSent() {
    setSent(true);
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={open} className={`${triggerClassName} cursor-pointer`}>
        {CONTACT_COPY.trigger}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onPointerDown={handleDialogPointerDown}
        onClick={handleDialogClick}
        onClose={handleClosed}
        className={DIALOG_CLASS}
      >
        <div className="relative flex flex-col gap-4 p-5 min-[600px]:p-6">
          <div className="flex flex-col gap-1 pr-10">
            <h2 id={titleId} className="text-xl font-semibold">
              {CONTACT_COPY.title}
            </h2>
            {!sent && <p className="text-sm text-muted">{CONTACT_COPY.intro}</p>}
          </div>
          <ContactForm key={formKey} onClose={close} onSent={handleSent} />
          {/* Last in the DOM, drawn in the corner: the dialog reads heading first and opens with focus on
              the first field (user decision 2026-10-23). */}
          <button type="button" aria-label={CONTACT_COPY.close} onClick={close} className={CLOSE_BUTTON_CLASS}>
            <span aria-hidden="true" className="text-[22px] leading-none">
              {CONTACT_COPY.closeGlyph}
            </span>
          </button>
        </div>
      </dialog>
    </>
  );
}
