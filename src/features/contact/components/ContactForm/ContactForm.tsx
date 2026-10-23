"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import { Alert, Button, FIELD_INPUT_CLASS, TextField } from "@/shared/ui";

import { HONEYPOT_FIELD } from "../../model/contact.constants";
import { CONTACT_COPY } from "../../model/contact-messages";
import type { ContactFieldErrors, ContactFormState } from "../../model/contact.types";

import type { ContactFormProps } from "./ContactForm.types";
import { focusFirstInvalidField } from "./focus-first-invalid-field";
import { submitContact } from "./submit-contact";

const INITIAL_STATE: ContactFormState = {
  status: "idle",
  values: { name: "", email: "", message: "", [HONEYPOT_FIELD]: "" },
};

// About 118 px tall, as in the approved mockup.
const MESSAGE_ROWS = 5;

const NO_FIELD_ERRORS: ContactFieldErrors = {};

// The disabled fieldset dims its inputs, which TextField gives no class of their own.
const FIELDSET_CLASS = "flex min-w-0 flex-col gap-4 [&_input:disabled]:opacity-50";

/** The contact form and its sent view (design D5). */
export function ContactForm({ onClose, onSent }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(submitContact, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  const messageErrorId = `${messageId}-error`;

  useEffect(() => {
    if (state.status === "sent") {
      onSent();
      return;
    }
    // The disabled fieldset dropped focus while sending: give it back where the visitor acts next.
    if (state.status === "failed") {
      submitRef.current?.focus();
      return;
    }
    if (state.status === "invalid") focusFirstInvalidField(formRef.current, state.fieldErrors);
  }, [state, onSent]);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert tone="success" className="self-stretch">
          {CONTACT_COPY.sent}
        </Alert>
        <Button onClick={onClose} autoFocus>
          {CONTACT_COPY.close}
        </Button>
      </div>
    );
  }

  // useActionState keeps the previous result until the next one arrives; hide it from the moment of submit.
  const fieldErrors = !pending && state.status === "invalid" ? state.fieldErrors : NO_FIELD_ERRORS;
  const failed = !pending && state.status === "failed";
  const { values } = state;

  return (
    // noValidate: the schema is the only validation, so its messages are what the visitor sees.
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
      {failed && <Alert tone="danger">{CONTACT_COPY.sendFailed}</Alert>}
      <fieldset disabled={pending} className={FIELDSET_CLASS}>
        <TextField
          label={CONTACT_COPY.nameLabel}
          name="name"
          type="text"
          autoComplete="name"
          autoFocus
          defaultValue={values.name}
          error={fieldErrors.name}
        />
        <TextField
          label={CONTACT_COPY.emailLabel}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          error={fieldErrors.email}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={messageId} className="text-sm font-medium">
            {CONTACT_COPY.messageLabel}
          </label>
          <textarea
            id={messageId}
            name="message"
            rows={MESSAGE_ROWS}
            defaultValue={values.message}
            aria-invalid={fieldErrors.message ? true : undefined}
            aria-describedby={fieldErrors.message ? messageErrorId : undefined}
            className={`${FIELD_INPUT_CLASS} resize-y disabled:opacity-50`}
          />
          {fieldErrors.message && (
            <p id={messageErrorId} className="text-sm font-medium text-danger">
              {fieldErrors.message}
            </p>
          )}
        </div>
        <Button ref={submitRef} type="submit" className="self-start">
          {pending ? CONTACT_COPY.submitting : CONTACT_COPY.submit}
        </Button>
      </fieldset>
      {/* Bots fill every field; people never see or reach this one (FR-10). */}
      <div aria-hidden="true" className="sr-only">
        <input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue={values[HONEYPOT_FIELD]} />
      </div>
    </form>
  );
}
