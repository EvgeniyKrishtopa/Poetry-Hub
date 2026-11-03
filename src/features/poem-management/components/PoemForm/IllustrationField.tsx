import Image from "next/image";
import { useId } from "react";

import { IMAGE_QUALITY } from "@/shared/config/constants";
import { isUnoptimizableImage } from "@/shared/lib/image-file/is-unoptimizable-image";
import { Button, ImagePicker } from "@/shared/ui";

import type { IllustrationState } from "../../model/poem-form-values";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { ILLUSTRATION_PREVIEW_HEIGHT, ILLUSTRATION_PREVIEW_WIDTH } from "../../model/poem-management.constants";

import type { IllustrationFieldProps } from "./IllustrationField.types";

interface Preview {
  readonly src: string;
  readonly unoptimized: boolean;
}

/** The preview's source: the stored public URL, or the picked file's `blob:` URL that only the browser can read. */
function previewOf(illustration: IllustrationState): Preview | null {
  if (illustration.kind === "stored") {
    return { src: illustration.url, unoptimized: isUnoptimizableImage(illustration.url) };
  }
  if (illustration.kind === "new") return { src: illustration.draft.previewUrl, unoptimized: true };
  return null;
}

/**
 * The optional illustration: the picker, its error, the stored or chosen file's 16:9 preview, and the remove
 * button, which is offered for a rejected file too, so the author can clear the error (add-poem-creation FR-3,
 * FR-4; edit-poem design D6).
 */
export function IllustrationField({
  id,
  pickerKey,
  illustration,
  error,
  labels,
  onFileChange,
  onRemove,
}: IllustrationFieldProps) {
  const errorId = useId();
  const preview = previewOf(illustration);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {POEM_MANAGEMENT_COPY.illustrationLabel}
      </label>
      <ImagePicker
        key={pickerKey}
        id={id}
        buttonLabel={preview === null ? labels.choose : labels.replace}
        fileName={illustration.kind === "new" ? illustration.draft.file.name : null}
        errorId={error ? errorId : undefined}
        onFileChange={onFileChange}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {preview !== null && (
        <Image
          // Cropped to the poem page's 16:9 frame, so the author sees what readers will.
          className="mt-1.5 aspect-video w-full rounded-2xl bg-surface object-cover"
          src={preview.src}
          // The field's label and the picker already name it (edit-poem NFR-4).
          alt=""
          width={ILLUSTRATION_PREVIEW_WIDTH}
          height={ILLUSTRATION_PREVIEW_HEIGHT}
          quality={IMAGE_QUALITY}
          unoptimized={preview.unoptimized}
        />
      )}
      {(preview !== null || error !== undefined) && (
        <Button variant="ghost" onClick={onRemove} className="-ml-4 self-start">
          {labels.remove}
        </Button>
      )}
    </div>
  );
}
