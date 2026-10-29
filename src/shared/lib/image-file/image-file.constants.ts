import type { ImageType } from "./image-file.types";

/** The largest image a reader may upload: the author photo and the poem illustration (5 MB). */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * How a sniffed image type is stored: the object's extension (the database path checks allow only
 * `png` and `jpg`) and its content type. Never derived from the browser-supplied `File.type`.
 */
export const IMAGE_FORMATS: Readonly<Record<ImageType, { readonly extension: string; readonly contentType: string }>> = {
  png: { extension: "png", contentType: "image/png" },
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
};
