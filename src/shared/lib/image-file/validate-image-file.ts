import { detectImageType } from "./detect-image-type";
import { IMAGE_MAX_BYTES } from "./image-file.constants";
import type { ImageFileCheck } from "./image-file.types";

/** Enough leading bytes for every signature `detectImageType` knows. */
const HEADER_BYTES = 12;

/** Size, then type by content. Runs in the browser before submit and again in the action. */
export async function validateImageFile(file: File): Promise<ImageFileCheck> {
  // Checked first, so an oversized file is rejected without reading any of it.
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, error: "too-large" };

  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const type = detectImageType(header);
  return type === null ? { ok: false, error: "unsupported-type" } : { ok: true, type };
}
