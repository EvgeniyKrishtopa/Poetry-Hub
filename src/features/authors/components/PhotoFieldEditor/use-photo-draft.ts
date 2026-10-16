"use client";

import { useEffect, useState } from "react";

import { PHOTO_FILE_ERROR_MESSAGES } from "../../model/author-messages";
import { validatePhotoFile } from "../../model/validate-photo-file";

import type { PhotoDraft } from "./PhotoFieldEditor.types";

/**
 * The chosen photo file, checked in the browser, with its object-URL preview.
 *
 * Why the check runs here and not only in the Server Action, which repeats it: FR-8 requires that
 * an invalid file is never sent. A file over Next's action body limit would also be rejected before
 * the action runs, and the reader would see the generic error instead of the size message (design D4).
 */
export function usePhotoDraft() {
  const [draft, setDraft] = useState<PhotoDraft | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Each preview URL is released once its draft is replaced, cleared, or the editor unmounts.
  useEffect(() => {
    if (draft === null) return undefined;
    const { previewUrl } = draft;
    return () => URL.revokeObjectURL(previewUrl);
  }, [draft]);

  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (file === undefined) return;
    const check = await validatePhotoFile(file);
    // The reader chose another file while this one was being checked: that file's check decides.
    if (input.files?.[0] !== file) return;
    if (!check.ok) {
      setDraft(null);
      setFileError(PHOTO_FILE_ERROR_MESSAGES[check.error]);
      return;
    }
    setFileError(null);
    setDraft({ file, previewUrl: URL.createObjectURL(file) });
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
    clearDraft: () => setDraft(null),
    reset: () => {
      setDraft(null);
      setFileError(null);
    },
  };
}
