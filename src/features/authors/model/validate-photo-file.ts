import { PHOTO_MAX_BYTES } from "./author.constants";
import type { PhotoFileCheck } from "./author.types";
import { detectImageType } from "./detect-image-type";

/** Enough leading bytes for every signature `detectImageType` knows. */
const HEADER_BYTES = 12;

/** Size, then type by content. Runs in the browser before submit and again in the action (design D4). */
export async function validatePhotoFile(file: File): Promise<PhotoFileCheck> {
  // Checked first, so an oversized file is rejected without reading any of it.
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, error: "too-large" };

  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const type = detectImageType(header);
  return type === null ? { ok: false, error: "unsupported-type" } : { ok: true, type };
}
