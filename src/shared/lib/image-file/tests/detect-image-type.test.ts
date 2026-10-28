import { describe, expect, it } from "vitest";

import { detectImageType } from "../detect-image-type";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

describe("detectImageType", () => {
  // implements FR-8 of add-author-profiles
  it.each([
    ["a PNG header", PNG_HEADER, "png"],
    ["a JPEG header", JPEG_HEADER, "jpeg"],
    ["a GIF header", GIF_HEADER, null],
    ["a truncated PNG header", PNG_HEADER.slice(0, 4), null],
    ["a truncated JPEG header", JPEG_HEADER.slice(0, 2), null],
    ["no bytes", [], null],
  ] as const)("%s → %s", (_case, bytes, expected) => {
    expect(detectImageType(Uint8Array.from(bytes))).toBe(expected);
  });
});
