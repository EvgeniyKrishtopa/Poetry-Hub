"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { Button } from "@/shared/ui";

import { checkCollectionPoemsAction } from "../../actions/check-collection-poems.actions";
import { COLLECTION_POEMS_ON_PAGE_COPY } from "../../model/collection-management-messages";
import { CHECK_COLLECTION_POEMS_STATUS } from "../../model/collection-management.constants";
import type { CheckCollectionPoemsResult } from "../../model/collection-management.types";
import { collectionPoemsPath } from "../../model/collection-paths";

import type { ManageCollectionPoemsButtonProps } from "./ManageCollectionPoemsButton.types";

/** The ghost button that checks, then opens the collection poems page or reports why not (design D4). */
export function ManageCollectionPoemsButton({ collectionId, onError }: ManageCollectionPoemsButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Set synchronously on press: a second press can arrive before the pending state reaches the button.
  const sendingRef = useRef(false);
  const connection = useConnectionStatus();
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });
  const isOnline = connection === CONNECTION_STATUS.online;
  const isDisabled = !isOnline || isPending;

  function handleResult(result: CheckCollectionPoemsResult | undefined) {
    if (result?.status === CHECK_COLLECTION_POEMS_STATUS.ready) {
      router.push(collectionPoemsPath(collectionId));
      return;
    }
    if (result?.status === CHECK_COLLECTION_POEMS_STATUS.notFound) {
      onError("not-found");
      return;
    }
    if (result?.status === CHECK_COLLECTION_POEMS_STATUS.nothingToManage) {
      onError("nothing-to-manage");
      return;
    }
    if (result?.failure === "unauthenticated") {
      useSessionExpiredNotice.getState().markSessionExpired();
      router.replace(SIGN_IN_PATH);
      // The root layout's header still shows the signed-in links until the server renders it again.
      router.refresh();
      return;
    }
    // `unavailable`, `unknown`, or no data at all (a server error or a rejected input).
    onError("unavailable");
  }

  async function check() {
    let result: CheckCollectionPoemsResult | undefined;
    try {
      result = (await checkCollectionPoemsAction({ collectionId })).data;
    } catch (error) {
      // The error's type only: never the collection's content (NFR-5).
      console.error(`[collection-management] poems check rejected: ${error instanceof Error ? error.name : typeof error}`);
      // Offline: the live notice above the row already says why, so no failure text (FR-14).
      if (connectionRef.current !== CONNECTION_STATUS.offline) onError("unavailable");
      return;
    }
    handleResult(result);
  }

  // `aria-disabled`, not `disabled`: the button keeps focus while the check runs and after it fails (FR-3,
  // FR-14). A press is ignored here instead.
  function press() {
    if (isDisabled || sendingRef.current) return;
    sendingRef.current = true;
    // The next press hides the previous alert.
    onError(null);
    startTransition(async () => {
      try {
        await check();
      } finally {
        sendingRef.current = false;
      }
    });
  }

  return (
    <Button
      variant="ghost"
      aria-disabled={isDisabled ? true : undefined}
      aria-busy={isPending ? true : undefined}
      onClick={press}
      className="self-start aria-disabled:opacity-50"
    >
      {COLLECTION_POEMS_ON_PAGE_COPY.manage}
    </Button>
  );
}
