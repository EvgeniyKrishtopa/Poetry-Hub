"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { Alert, Button, ConnectionNotice } from "@/shared/ui";

import { createCollectionAction } from "../../actions/create-collection.actions";
import { useCollectionForm } from "../../hooks/use-collection-form";
import type { CollectionFormValues } from "../../model/collection-form-values";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import { CREATE_COLLECTION_FAILURE_MESSAGES, NEW_COLLECTION_COPY } from "../../model/collection-management-messages";
import { CREATE_COLLECTION_STATUS } from "../../model/collection-management.constants";
import type { CreateCollectionFailure, CreateCollectionResult } from "../../model/collection-management.types";
import { COLLECTION_FIELDSET_CLASS } from "../CollectionFormFields/collection-fieldset-class";
import { CollectionFormFields } from "../CollectionFormFields/CollectionFormFields";

const EMPTY_VALUES: CollectionFormValues = { title: "", description: "" };

/** A failure that keeps the author on the page; `unauthenticated` leaves for `/login` instead. */
type ShownFailure = Exclude<CreateCollectionFailure, "unauthenticated">;

/** A new object per failure, so the same failure twice moves focus to the alert twice. */
interface FailureAlert {
  readonly failure: ShownFailure;
}

/** The create form: fields, the create call and its outcomes, the connection notice (design D5). */
export function NewCollectionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useCollectionForm(EMPTY_VALUES, { isPending, formRef });
  const [failureAlert, setFailureAlert] = useState<FailureAlert | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const handledAlertRef = useRef<FailureAlert | null>(null);
  // Set synchronously on submit: a second click can arrive before the pending state disables the form.
  const submittingRef = useRef(false);
  const connection = useConnectionStatus();
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });
  const isOnline = connection === CONNECTION_STATUS.online;

  // The fieldset is disabled while sending: focus moves once the form is enabled again (NFR-4).
  useEffect(() => {
    if (isPending || failureAlert === null || handledAlertRef.current === failureAlert) return;
    handledAlertRef.current = failureAlert;
    alertRef.current?.focus();
  }, [isPending, failureAlert]);

  function showFailure(failure: ShownFailure) {
    setFailureAlert({ failure });
  }

  function handleResult(result: CreateCollectionResult | undefined) {
    // No data: a malformed request or a rejected body, which the form never sends on purpose.
    if (result === undefined) {
      showFailure("unknown");
      return;
    }
    if (result.status === CREATE_COLLECTION_STATUS.created) {
      // Only written, after the answer: `getState()`, no subscription.
      useCollectionListNotice.getState().setListNotice({ kind: "created", title: result.title });
      // Replaced, so Back from the list can't reach a filled form that would create a second collection.
      router.replace(POEM_MANAGEMENT_PATH);
      return;
    }
    if (result.status === CREATE_COLLECTION_STATUS.invalid) {
      form.showFieldErrors(result.fieldErrors);
      return;
    }
    if (result.failure === "unauthenticated") {
      useSessionExpiredNotice.getState().markSessionExpired();
      router.replace(SIGN_IN_PATH);
      // The header still shows the signed-in links from the old render.
      router.refresh();
      return;
    }
    showFailure(result.failure);
  }

  async function send(values: CollectionFormValues) {
    let result: CreateCollectionResult | undefined;
    try {
      result = (await createCollectionAction(values)).data;
    } catch (error) {
      // The error's type only: never the collection's content (NFR-5).
      console.error(`[collection-management] create call rejected: ${error instanceof Error ? error.name : typeof error}`);
      // Offline: the live notice already says why, so no alert is shown (FR-14).
      if (connectionRef.current !== CONNECTION_STATUS.offline) showFailure("unknown");
      return;
    }
    handleResult(result);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Checked here as well as by the disabled button.
    if (!isOnline || submittingRef.current) return;
    // The next submit hides the previous outcome.
    setFailureAlert(null);
    const check = form.validate();
    if (!check.ok) return;

    submittingRef.current = true;
    startTransition(async () => {
      try {
        await send(check.values);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <>
      {/* Between the heading and the form, at the page's own gap (artboard 31). */}
      <ConnectionNotice status={connection} />
      {/* noValidate: the schema is the only validation, so its messages are what the author sees. */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isPending} className={COLLECTION_FIELDSET_CLASS}>
          <CollectionFormFields form={form} />
          {failureAlert !== null && (
            // Focusable by script only: focus lands here when the failure names no field.
            <div ref={alertRef} tabIndex={-1}>
              <Alert tone="danger">{CREATE_COLLECTION_FAILURE_MESSAGES[failureAlert.failure]}</Alert>
            </div>
          )}
          <Button type="submit" disabled={!isOnline} className="self-start">
            {isPending ? NEW_COLLECTION_COPY.submitPending : NEW_COLLECTION_COPY.submit}
          </Button>
        </fieldset>
      </form>
    </>
  );
}
