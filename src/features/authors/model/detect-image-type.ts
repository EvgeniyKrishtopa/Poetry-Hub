import type { ImageType } from "./author.types";

const SIGNATURES: ReadonlyArray<{ readonly type: ImageType; readonly bytes: readonly number[] }> = [
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "jpeg", bytes: [0xff, 0xd8, 0xff] },
];

/** PNG or JPEG by the file's leading magic bytes; anything else is `null` (FR-8). */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const match = SIGNATURES.find((signature) => signature.bytes.every((byte, index) => bytes[index] === byte));
  return match?.type ?? null;
}
