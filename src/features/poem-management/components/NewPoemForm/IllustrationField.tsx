import Image from "next/image";
import { useId } from "react";

import { Button, ImagePicker } from "@/shared/ui";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { ILLUSTRATION_PREVIEW_HEIGHT, ILLUSTRATION_PREVIEW_WIDTH } from "../../model/poem-management.constants";

import type { IllustrationFieldProps } from "./IllustrationField.types";

/**
 * The optional illustration: the picker, its error, the chosen file's 16:9 preview, and the remove button,
 * which is offered for a rejected file too, so the author can clear the error (FR-3, FR-4).
 */
export function IllustrationField({ id, pickerKey, draft, error, onFileChange, onRemove }: IllustrationFieldProps) {
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {POEM_MANAGEMENT_COPY.illustrationLabel}
      </label>
      <ImagePicker
        key={pickerKey}
        id={id}
        buttonLabel={POEM_MANAGEMENT_COPY.illustrationButton}
        fileName={draft?.file.name ?? null}
        errorId={error ? errorId : undefined}
        onFileChange={onFileChange}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {draft !== null && (
        <Image
          // Cropped to the poem page's 16:9 frame, so the author sees what readers will.
          className="mt-1.5 aspect-video w-full rounded-2xl bg-surface object-cover"
          src={draft.previewUrl}
          // The file name next to the picker already names the choice.
          alt=""
          width={ILLUSTRATION_PREVIEW_WIDTH}
          height={ILLUSTRATION_PREVIEW_HEIGHT}
          // A `blob:` URL only the browser can read.
          unoptimized
        />
      )}
      {(draft !== null || error !== undefined) && (
        <Button variant="ghost" onClick={onRemove} className="-ml-4 self-start">
          {POEM_MANAGEMENT_COPY.removeIllustration}
        </Button>
      )}
    </div>
  );
}
