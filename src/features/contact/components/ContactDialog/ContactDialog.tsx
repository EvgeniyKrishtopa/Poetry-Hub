"use client";

import { useEffect, useRef, useState } from "react";

import { Dialog } from "@/shared/ui";

import { CONTACT_COPY } from "../../model/contact-messages";
import { SENT_AUTO_CLOSE_MS } from "../../model/contact.constants";
import { ContactForm } from "../ContactForm/ContactForm";

import type { ContactDialogProps } from "./ContactDialog.types";

/** The footer's contact button and the modal dialog with the contact form it opens (design D6). */
export function ContactDialog({ triggerClassName }: ContactDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The form stays mounted while closed, so typed values and errors survive (FR-4); a new key after a
  // success remounts it empty, once the dialog has closed.
  const [formKey, setFormKey] = useState(0);
  const [sent, setSent] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // The thank-you view closes the open dialog by itself; any earlier close clears the timer (design D1).
  useEffect(() => {
    if (!sent || !isOpen) return;
    // The ref, not `close`: a ref needs no dependency entry (react-hooks/exhaustive-deps).
    const timer = setTimeout(() => dialogRef.current?.close(), SENT_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [sent, isOpen]);

  function open() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  // The thank-you view's close button.
  function close() {
    dialogRef.current?.close();
  }

  // The thank-you view replaces the intro until the dialog closes.
  function handleSent() {
    setSent(true);
  }

  // Every close path ends here. `isOpen` clears first, so a success that arrives while closed
  // starts its timer on the next open, not at once.
  function handleClosed() {
    setIsOpen(false);
    if (!sent) return;
    setFormKey((key) => key + 1);
    setSent(false);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        className={`${triggerClassName} cursor-pointer`}
      >
        {CONTACT_COPY.trigger}
      </button>
      <Dialog
        ref={dialogRef}
        title={CONTACT_COPY.title}
        description={sent ? undefined : CONTACT_COPY.intro}
        closeLabel={CONTACT_COPY.close}
        onClose={handleClosed}
      >
        <ContactForm key={formKey} onClose={close} onSent={handleSent} />
      </Dialog>
    </>
  );
}
