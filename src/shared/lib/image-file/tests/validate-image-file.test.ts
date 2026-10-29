// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { IMAGE_MAX_BYTES } from "../image-file.constants";
import { validateImageFile } from "../validate-image-file";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00];

function fileWith(header: readonly number[], name: string, size = header.length): File {
  const bytes = new Uint8Array(size);
  bytes.set(header);
  return new File([bytes], name, { type: "image/png" });
}

describe("validateImageFile", () => {
  // implements FR-8 of add-author-profiles
  it("accepts a PNG and a JPEG by content", async () => {
    await expect(validateImageFile(fileWith(PNG_HEADER, "photo.png"))).resolves.toEqual({ ok: true, type: "png" });
    await expect(validateImageFile(fileWith(JPEG_HEADER, "photo.jpg"))).resolves.toEqual({ ok: true, type: "jpeg" });
  });

  it("rejects a GIF renamed .png as an unsupported type", async () => {
    await expect(validateImageFile(fileWith(GIF_HEADER, "photo.png"))).resolves.toEqual({
      ok: false,
      error: "unsupported-type",
    });
  });

  it("rejects a file too short to hold any signature", async () => {
    await expect(validateImageFile(fileWith(PNG_HEADER.slice(0, 3), "photo.png"))).resolves.toEqual({
      ok: false,
      error: "unsupported-type",
    });
  });

  it("accepts a PNG of exactly 5 MiB", async () => {
    await expect(validateImageFile(fileWith(PNG_HEADER, "photo.png", IMAGE_MAX_BYTES))).resolves.toEqual({
      ok: true,
      type: "png",
    });
  });

  it("rejects a 5 MiB + 1 file as too large without reading its bytes", async () => {
    const file = fileWith(PNG_HEADER, "photo.png", IMAGE_MAX_BYTES + 1);
    const slice = vi.spyOn(file, "slice");

    await expect(validateImageFile(file)).resolves.toEqual({ ok: false, error: "too-large" });
    expect(slice).not.toHaveBeenCalled();
  });
});
