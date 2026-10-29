// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  deleteProfileFieldSchema,
  saveAboutSchema,
  saveNameSchema,
  savePhotoSchema,
} from "../../model/author-profile.schema";
import { IMAGE_MAX_BYTES } from "@/shared/lib/image-file/image-file.constants";

const EMOJI = "🌙";

function nameError(value: unknown): string | undefined {
  const result = saveNameSchema.safeParse({ field: "first_name", value });
  return result.success ? undefined : result.error.issues[0]?.message;
}

function aboutError(about: unknown): string | undefined {
  const result = saveAboutSchema.safeParse({ about });
  return result.success ? undefined : result.error.issues[0]?.message;
}

function fileOfSize(size: number): File {
  return new File([new Uint8Array(size)], "photo.png", { type: "image/png" });
}

describe("saveNameSchema", () => {
  // implements FR-8, NFR-8 of add-author-profiles
  it("accepts 60 characters and rejects 61 with the Russian message", () => {
    expect(nameError("а".repeat(60))).toBeUndefined();
    expect(nameError("а".repeat(61))).toBe("Не более 60 символов.");
  });

  it("counts code points, so 60 emoji are accepted and 61 are not", () => {
    expect(nameError(EMOJI.repeat(60))).toBeUndefined();
    expect(nameError(EMOJI.repeat(61))).toBe("Не более 60 символов.");
  });

  it.each(["", "   ", "\t\n"])("rejects the blank value %j as required", (value) => {
    expect(nameError(value)).toBe("Обязательное поле.");
  });

  it("rejects a missing value as required", () => {
    expect(nameError(undefined)).toBe("Обязательное поле.");
  });

  it("trims, so 60 characters plus surrounding spaces are stored trimmed", () => {
    const value = "а".repeat(60);

    expect(saveNameSchema.parse({ field: "last_name", value: `  ${value}  ` })).toEqual({
      field: "last_name",
      value,
    });
  });

  it("rejects a field that is not a name", () => {
    expect(saveNameSchema.safeParse({ field: "about", value: "Анна" }).success).toBe(false);
  });
});

describe("saveAboutSchema", () => {
  // implements FR-8, NFR-8 of add-author-profiles
  it("accepts 1000 characters and rejects 1001", () => {
    expect(aboutError("а".repeat(1000))).toBeUndefined();
    expect(aboutError("а".repeat(1001))).toBe("Не более 1000 символов.");
  });

  it("counts code points: 1000 emoji are accepted, 1001 are not", () => {
    expect(aboutError(EMOJI.repeat(1000))).toBeUndefined();
    expect(aboutError(EMOJI.repeat(1001))).toBe("Не более 1000 символов.");
  });

  it("counts Markdown syntax: 996 characters in bold make exactly 1000", () => {
    expect(aboutError(`**${"а".repeat(996)}**`)).toBeUndefined();
    expect(aboutError(`**${"а".repeat(997)}**`)).toBe("Не более 1000 символов.");
  });

  it("trims before counting and stores the trimmed value", () => {
    const about = "а".repeat(1000);

    expect(saveAboutSchema.parse({ about: `\n  ${about}  \n` })).toEqual({ about });
  });

  it("rejects a blank about as required", () => {
    expect(aboutError("   ")).toBe("Обязательное поле.");
  });

  // implements FR-4 of refine-author-page-and-contact
  it("drops any field other than about", () => {
    expect(saveAboutSchema.parse({ about: "Текст", align: "justify" })).toEqual({ about: "Текст" });
  });
});

describe("savePhotoSchema", () => {
  // implements FR-8, NFR-8 of add-author-profiles
  it("accepts a file of exactly 5 MiB", () => {
    expect(savePhotoSchema.safeParse({ photo: fileOfSize(IMAGE_MAX_BYTES) }).success).toBe(true);
  });

  it("rejects a file of 5 MiB + 1 byte", () => {
    const result = savePhotoSchema.safeParse({ photo: fileOfSize(IMAGE_MAX_BYTES + 1) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Файл должен быть не больше 5 МБ.");
  });

  it("rejects a value that is not a file", () => {
    const result = savePhotoSchema.safeParse({ photo: "photo.png" });

    expect(result.error?.issues[0]?.message).toBe("Обязательное поле.");
  });
});

describe("deleteProfileFieldSchema", () => {
  it.each(["first_name", "last_name", "about", "photo"])("accepts %s", (field) => {
    expect(deleteProfileFieldSchema.safeParse({ field }).success).toBe(true);
  });

  it("rejects any other field", () => {
    expect(deleteProfileFieldSchema.safeParse({ field: "user_id" }).success).toBe(false);
  });
});
