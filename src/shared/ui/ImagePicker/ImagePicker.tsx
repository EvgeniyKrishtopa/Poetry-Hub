import type { ImagePickerProps } from "./ImagePicker.types";

const ACCEPTED_TYPES = "image/png,image/jpeg";

/**
 * An image file input with Russian text (add-author-profiles NFR-8). A native file input draws its
 * button and status in the browser's own language, which no attribute changes, so the input is
 * visually hidden but stays focusable and named, and a label drawn as a pill opens it instead.
 */
export function ImagePicker({ id, buttonLabel, fileName, errorId, onFileChange, autoFocus = false }: ImagePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        id={id}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={(event) => onFileChange(event.currentTarget)}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        autoFocus={autoFocus}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="cursor-pointer rounded-full bg-surface px-3 py-2 text-sm font-medium text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      >
        {buttonLabel}
      </label>
      {fileName !== null && <span className="text-sm break-all text-muted">{fileName}</span>}
    </div>
  );
}
