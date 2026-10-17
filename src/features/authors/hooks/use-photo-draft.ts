"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { PHOTO_FILE_ERROR_MESSAGES } from "../model/author-messages";
import { validatePhotoFile } from "../model/validate-photo-file";

import { getObjectUrl, subscribeObjectUrl } from "./object-url-store";
import type { PhotoDraft } from "./profile-field.types";

/**
 * The chosen photo file, checked in the browser, with its object-URL preview.
 *
 * Why the check runs here and not only in the Server Action, which repeats it: FR-8 requires that
 * an invalid file is never sent. A file over Next's action body limit would also be rejected before
 * the action runs, and the reader would see the generic error instead of the size message (design D4).
 */
export function usePhotoDraft() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // The store creates the URL on subscribe and releases it on unsubscribe; React re-reads the
  // snapshot right after subscribing, so no change notification is needed.
  const subscribe = useCallback(() => (file === null ? () => undefined : subscribeObjectUrl(file)), [file]);
  const previewUrl = useSyncExternalStore(
    subscribe,
    () => (file === null ? null : getObjectUrl(file)),
    () => null,
  );
  const draft: PhotoDraft | null = file !== null && previewUrl !== null ? { file, previewUrl } : null;

  async function choose(input: HTMLInputElement) {
    const chosen = input.files?.[0];
    if (chosen === undefined) return;
    const check = await validatePhotoFile(chosen);
    // The reader chose another file while this one was being checked: that file's check decides.
    if (input.files?.[0] !== chosen) return;
    if (!check.ok) {
      setFile(null);
      setFileError(PHOTO_FILE_ERROR_MESSAGES[check.error]);
      return;
    }
    setFileError(null);
    setFile(chosen);
  }

  /** Checks the chosen file again right before sending; `false` shows the error instead. */
  async function recheck(chosen: PhotoDraft): Promise<boolean> {
    const check = await validatePhotoFile(chosen.file);
    if (!check.ok) setFileError(PHOTO_FILE_ERROR_MESSAGES[check.error]);
    return check.ok;
  }

  return {
    draft,
    fileError,
    choose,
    recheck,
    // Set inside the field's action, so the URL is released only after the transition commits.
    clearDraft: () => setFile(null),
    reset: () => {
      setFile(null);
      setFileError(null);
    },
  };
}
