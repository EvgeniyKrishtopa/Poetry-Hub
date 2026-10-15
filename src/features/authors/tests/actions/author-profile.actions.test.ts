// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUserId } from "@/features/auth";

import {
  deleteProfileFieldAction,
  saveAboutAction,
  saveNameAction,
  savePhotoAction,
} from "../../actions/author-profile.actions";
import { clearProfileField, removePhoto, replacePhoto, writeOwnProfile } from "../../dal/author-profile-writes";
import { getProfileFailureMessage, VALIDATION_MESSAGES } from "../../model/author-messages";
import type { AuthorProfile } from "../../model/author.types";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("../../dal/author-profile-writes", () => ({
  writeOwnProfile: vi.fn(),
  clearProfileField: vi.fn(),
  replacePhoto: vi.fn(),
  removePhoto: vi.fn(),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const NAME = "Анна";

const PROFILE: AuthorProfile = {
  id: PROFILE_ID,
  firstName: NAME,
  lastName: null,
  about: null,
  aboutAlign: "left",
  photoUrl: null,
};

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_BYTES = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];

function file(bytes: readonly number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("author profile actions", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue(USER_ID);
    for (const write of [writeOwnProfile, clearProfileField, replacePhoto, removePhoto]) {
      vi.mocked(write).mockResolvedValue({ ok: true, profile: PROFILE });
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("saveNameAction", () => {
    // implements FR-8 of add-author-profiles
    it("returns a field error for a blank name without a session check or DAL call", async () => {
      const result = await saveNameAction({ field: "first_name", value: "   " });

      expect(result.validationErrors?.fieldErrors.value).toEqual([VALIDATION_MESSAGES.required]);
      expect(getCurrentUserId).not.toHaveBeenCalled();
      expect(writeOwnProfile).not.toHaveBeenCalled();
    });

    // implements FR-17, NFR-2 of add-author-profiles
    it("writes the trimmed value and expires the directory's and the author's tags", async () => {
      const result = await saveNameAction({ field: "last_name", value: `  ${NAME}  ` });

      expect(writeOwnProfile).toHaveBeenCalledExactlyOnceWith({ last_name: NAME });
      expect(result.data).toEqual({ status: "saved", profile: PROFILE });
      expect(updateTag).toHaveBeenCalledWith("authors");
      expect(updateTag).toHaveBeenCalledWith(`author:${PROFILE_ID}`);
    });

    // implements NFR-2 of add-author-profiles
    it("returns unauthenticated without a DAL call when there is no session", async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null);

      const result = await saveNameAction({ field: "first_name", value: NAME });

      expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
      expect(writeOwnProfile).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("ignores any user or profile id in the input", async () => {
      await saveNameAction({ field: "first_name", value: NAME, userId: "someone-else", id: "x" } as never);

      expect(writeOwnProfile).toHaveBeenCalledExactlyOnceWith({ first_name: NAME });
    });

    // implements FR-9 of add-author-profiles
    it("passes a DAL failure through without expiring any tag", async () => {
      vi.mocked(writeOwnProfile).mockResolvedValue({ ok: false, failure: "unavailable" });

      const result = await saveNameAction({ field: "first_name", value: NAME });

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
      expect(updateTag).not.toHaveBeenCalled();
    });

    // implements NFR-3 of add-author-profiles
    it("turns a thrown error into the generic serverError, logging only its name", async () => {
      vi.mocked(writeOwnProfile).mockRejectedValue(new Error(`boom ${NAME}`));

      const result = await saveNameAction({ field: "first_name", value: NAME });

      expect(result.serverError).toBe(getProfileFailureMessage("unknown"));
      expect(console.error).toHaveBeenCalledWith("[authors] action failed: Error");
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(NAME);
    });
  });

  describe("saveAboutAction", () => {
    // implements FR-10, FR-11 of add-author-profiles
    it("writes about and its alignment together", async () => {
      await saveAboutAction({ about: " ## Поэт ", align: "center" });

      expect(writeOwnProfile).toHaveBeenCalledExactlyOnceWith({ about: "## Поэт", about_align: "center" });
    });

    it("returns a field error for an invalid alignment without a DAL call", async () => {
      const result = await saveAboutAction({ about: "text", align: "justify" as never });

      expect(result.validationErrors?.fieldErrors.align).toEqual([VALIDATION_MESSAGES.invalidAlign]);
      expect(writeOwnProfile).not.toHaveBeenCalled();
    });
  });

  describe("savePhotoAction", () => {
    // implements FR-8, FR-12 of add-author-profiles
    it("uploads a PNG with the type read from its bytes", async () => {
      const photo = file(PNG_BYTES, "photo.jpg", "image/jpeg");

      const result = await savePhotoAction({ photo });

      expect(replacePhoto).toHaveBeenCalledExactlyOnceWith(expect.any(File), "png");
      expect(result.data).toEqual({ status: "saved", profile: PROFILE });
      expect(updateTag).toHaveBeenCalledWith(`author:${PROFILE_ID}`);
    });

    // implements FR-8 of add-author-profiles
    it("rejects a GIF disguised as PNG with a field error and no upload", async () => {
      const result = await savePhotoAction({ photo: file(GIF_BYTES, "photo.png", "image/png") });

      expect(result.validationErrors?.fieldErrors.photo).toEqual([VALIDATION_MESSAGES.photoUnsupportedType]);
      expect(replacePhoto).not.toHaveBeenCalled();
      expect(getCurrentUserId).not.toHaveBeenCalled();
    });

    it("rejects a file over 5 MiB with a field error and no upload", async () => {
      const tooLarge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });

      const result = await savePhotoAction({ photo: tooLarge });

      expect(result.validationErrors?.fieldErrors.photo).toEqual([VALIDATION_MESSAGES.photoTooLarge]);
      expect(replacePhoto).not.toHaveBeenCalled();
    });

    it("returns unauthenticated without an upload when there is no session", async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null);

      const result = await savePhotoAction({ photo: file(PNG_BYTES, "photo.png", "image/png") });

      expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
      expect(replacePhoto).not.toHaveBeenCalled();
    });
  });

  describe("deleteProfileFieldAction", () => {
    // implements FR-10 of add-author-profiles
    it("removes the photo through removePhoto", async () => {
      await deleteProfileFieldAction({ field: "photo" });

      expect(removePhoto).toHaveBeenCalledOnce();
      expect(clearProfileField).not.toHaveBeenCalled();
    });

    it.each(["first_name", "last_name", "about"] as const)("clears %s through clearProfileField", async (field) => {
      await deleteProfileFieldAction({ field });

      expect(clearProfileField).toHaveBeenCalledExactlyOnceWith(field);
    });

    it("expires only the directory tag when no profile is left", async () => {
      vi.mocked(clearProfileField).mockResolvedValue({ ok: true, profile: null });

      const result = await deleteProfileFieldAction({ field: "about" });

      expect(result.data).toEqual({ status: "saved", profile: null });
      expect(updateTag).toHaveBeenCalledExactlyOnceWith("authors");
    });

    it("returns unauthenticated without a DAL call when there is no session", async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null);

      const result = await deleteProfileFieldAction({ field: "photo" });

      expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
      expect(removePhoto).not.toHaveBeenCalled();
    });

    it("returns a field error for an unknown field", async () => {
      const result = await deleteProfileFieldAction({ field: "user_id" as never });

      expect(result.validationErrors?.fieldErrors.field).toHaveLength(1);
      expect(clearProfileField).not.toHaveBeenCalled();
    });
  });
});
