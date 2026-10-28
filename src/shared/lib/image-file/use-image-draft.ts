"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import type { ImageDraft, ImageFileError } from "./image-file.types";
import { getObjectUrl, subscribeObjectUrl } from "./object-url-store";
import { validateImageFile } from "./validate-image-file";

/**
 * The chosen image file, checked in the browser, with its object-URL preview. A rejected file leaves
 * no draft and its error kind; the caller turns the kind into its own message.
 *
 * Why the check runs here and not only in the Server Action, which repeats it: an invalid file must
 * never be sent. A file over Next's action body limit would also be rejected before the action runs,
 * and the reader would see the generic error instead of the size message (add-author-profiles design D4).
 */
export function useImageDraft() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<ImageFileError | null>(null);

  // The store creates the URL on subscribe and releases it on unsubscribe; React re-reads the
  // snapshot right after subscribing, so no change notification is needed.
  const subscribe = useCallback(() => (file === null ? () => undefined : subscribeObjectUrl(file)), [file]);
  const previewUrl = useSyncExternalStore(
    subscribe,
    () => (file === null ? null : getObjectUrl(file)),
    () => null,
  );
  const draft: ImageDraft | null = file !== null && previewUrl !== null ? { file, previewUrl } : null;

  async function choose(input: HTMLInputElement) {
    const chosen = input.files?.[0];
    if (chosen === undefined) return;
    const check = await validateImageFile(chosen);
    // The reader chose another file while this one was being checked: that file's check decides.
    if (input.files?.[0] !== chosen) return;
    if (!check.ok) {
      setFile(null);
      setFileError(check.error);
      return;
    }
    setFileError(null);
    setFile(chosen);
  }

  /** Checks the chosen file again right before sending; `false` shows the error instead. */
  async function recheck(chosen: ImageDraft): Promise<boolean> {
    const check = await validateImageFile(chosen.file);
    if (!check.ok) setFileError(check.error);
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
