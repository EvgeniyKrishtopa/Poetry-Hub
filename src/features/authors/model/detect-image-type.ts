import type { ImageType } from "./author.types";

/** PNG or JPEG by the file's leading magic bytes; anything else is `null` (FR-8). */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  void bytes;
  throw new Error("not implemented");
}
