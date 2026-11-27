import "server-only";

import type { ImageType, ReencodeResult } from "./image-file.types";

/** Applies the EXIF orientation and re-encodes in the same format, keeping no metadata. */
export async function reencodeImage(file: File, type: ImageType): Promise<ReencodeResult> {
  void file;
  void type;
  throw new Error("not implemented");
}
