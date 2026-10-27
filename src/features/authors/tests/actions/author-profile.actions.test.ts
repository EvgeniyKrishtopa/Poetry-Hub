// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import {
  deleteProfileFieldAction,
  saveAboutAction,
  saveNameAction,
  savePhotoAction,
} from "../../actions/author-profile.actions";
import { clearProfileField, removePhoto, replacePhoto, writeOwnProfile } from "../../dal/author-profile-writes";
import { consumeWriteAllowance } from "../../dal/write-allowance";
import { getProfileFailureMessage, VALIDATION_MESSAGES } from "../../model/author-messages";
import type { AuthorProfile } from "../../model/author.types";
import { validatePhotoFile } from "../../model/validate-photo-file";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/author-profile-writes", () => ({
  writeOwnProfile: vi.fn(),
  clearProfileField: vi.fn(),
  replacePhoto: vi.fn(),
  removePhoto: vi.fn(),
}));
vi.mock("../../dal/write-allowance", () => ({ consumeWriteAllowance: vi.fn() }));
vi.mock("../../model/validate-photo-file", { spy: true });

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const NAME = "Анна";

const PROFILE: AuthorProfile = {
  id: PROFILE_ID,
  firstName: NAME,
  lastName: null,
  about: null,
  photoUrl: null,
};

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_BYTES = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];

function file(bytes: readonly number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("author profile actions", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    for (const write of [writeOwnProfile, clearProfileField, replacePhoto, removePhoto]) {
      vi.mocked(write).mockResolvedValue({ ok: true, profile: PROFILE });
    }
    vi.mocked(consumeWriteAllowance).mockResolvedValue({ ok: true });
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
      expect(getSessionState).not.toHaveBeenCalled();
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
      vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

      const result = await saveNameAction({ field: "first_name", value: NAME });

      expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
      expect(writeOwnProfile).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    // implements FR-20, FR-9 of add-author-profiles
    it("returns unavailable, not unauthenticated, without a DAL call when the session can't be checked", async () => {
      vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

      const result = await saveNameAction({ field: "first_name", value: NAME });

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
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
    it("writes the trimmed about", async () => {
      await saveAboutAction({ about: " ## Поэт " });

      expect(writeOwnProfile).toHaveBeenCalledExactlyOnceWith({ about: "## Поэт" });
    });

    // implements FR-4 of refine-author-page-and-contact
    it("ignores a stale alignment field and writes only about", async () => {
      // A variable, not a literal: a request from an old client still carries `align`.
      const staleRequest = { about: "Текст", align: "justify" };

      const result = await saveAboutAction(staleRequest);

      expect(result.validationErrors).toBeUndefined();
      expect(writeOwnProfile).toHaveBeenCalledExactlyOnceWith({ about: "Текст" });
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
    });

    it("checks the session before reading the file's bytes", async () => {
      vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });
      const photo = file(GIF_BYTES, "photo.png", "image/png");
      const slice = vi.spyOn(photo, "slice");

      const result = await savePhotoAction({ photo });

      expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
      expect(result.validationErrors).toBeUndefined();
      expect(slice).not.toHaveBeenCalled();
    });

    it("rejects a file over 5 MiB with a field error and no upload", async () => {
      const tooLarge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });

      const result = await savePhotoAction({ photo: tooLarge });

      expect(result.validationErrors?.fieldErrors.photo).toEqual([VALIDATION_MESSAGES.photoTooLarge]);
      expect(replacePhoto).not.toHaveBeenCalled();
    });

    it("returns unauthenticated without an upload when there is no session", async () => {
      vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

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
      vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

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

  describe("the per-user write limit", () => {
    const PROFILE_WRITES = [
      ["saveNameAction", () => saveNameAction({ field: "first_name", value: NAME })],
      ["saveAboutAction", () => saveAboutAction({ about: "Поэт" })],
      ["deleteProfileFieldAction (about)", () => deleteProfileFieldAction({ field: "about" })],
      ["deleteProfileFieldAction (the photo)", () => deleteProfileFieldAction({ field: "photo" })],
    ] as const;

    function expectNoWrite() {
      for (const write of [writeOwnProfile, clearProfileField, removePhoto, replacePhoto]) {
        expect(write).not.toHaveBeenCalled();
      }
      expect(updateTag).not.toHaveBeenCalled();
    }

    // implements FR-21 of add-author-profiles
    it.each(PROFILE_WRITES)("%s counts against the profile_write limit", async (_name, run) => {
      await run();

      expect(consumeWriteAllowance).toHaveBeenCalledExactlyOnceWith("profile_write");
    });

    // implements FR-21, FR-17 of add-author-profiles
    it.each(PROFILE_WRITES)("%s over the limit returns too-many-saves with no write and no tag expiry", async (_name, run) => {
      vi.mocked(consumeWriteAllowance).mockResolvedValue({ ok: false, failure: "too-many-saves" });

      const result = await run();

      expect(result.data).toEqual({ status: "failed", failure: "too-many-saves" });
      expectNoWrite();
    });

    // implements FR-21 of add-author-profiles
    it("savePhotoAction over the limit returns too-many-uploads before reading the file's bytes", async () => {
      vi.mocked(consumeWriteAllowance).mockResolvedValue({ ok: false, failure: "too-many-uploads" });
      const photo = file(PNG_BYTES, "photo.png", "image/png");
      const slice = vi.spyOn(photo, "slice");

      const result = await savePhotoAction({ photo });

      expect(consumeWriteAllowance).toHaveBeenCalledExactlyOnceWith("photo_upload");
      expect(result.data).toEqual({ status: "failed", failure: "too-many-uploads" });
      expect(validatePhotoFile).not.toHaveBeenCalled();
      expect(slice).not.toHaveBeenCalled();
      expectNoWrite();
    });

    // implements FR-21 of add-author-profiles
    it("a photo that fails the content check has already used its upload attempt", async () => {
      const result = await savePhotoAction({ photo: file(GIF_BYTES, "photo.jpg", "image/jpeg") });

      expect(consumeWriteAllowance).toHaveBeenCalledExactlyOnceWith("photo_upload");
      expect(validatePhotoFile).toHaveBeenCalledOnce();
      expect(vi.mocked(consumeWriteAllowance).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(validatePhotoFile).mock.invocationCallOrder[0] ?? 0,
      );
      expect(result.validationErrors?.fieldErrors.photo).toEqual([VALIDATION_MESSAGES.photoUnsupportedType]);
      expect(replacePhoto).not.toHaveBeenCalled();
    });

    // implements FR-21, FR-9 of add-author-profiles
    it.each(["unavailable", "unauthenticated", "unknown"] as const)(
      "a failed limit check (%s) is returned as is, with no write",
      async (failure) => {
        vi.mocked(consumeWriteAllowance).mockResolvedValue({ ok: false, failure });

        const result = await saveNameAction({ field: "first_name", value: NAME });

        expect(result.data).toEqual({ status: "failed", failure });
        expectNoWrite();
      },
    );

    // implements FR-21 of add-author-profiles
    it.each([
      ["signed out", { state: "signed-out" }],
      ["the session can't be checked", { state: "unknown" }],
    ] as const)("consumes no allowance when %s", async (_label, session) => {
      vi.mocked(getSessionState).mockResolvedValue(session);

      await saveNameAction({ field: "first_name", value: NAME });
      await savePhotoAction({ photo: file(PNG_BYTES, "photo.png", "image/png") });

      expect(consumeWriteAllowance).not.toHaveBeenCalled();
    });

    // implements FR-21 of add-author-profiles
    it("consumes no allowance for an input the schema rejects", async () => {
      const tooLarge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });

      await saveNameAction({ field: "first_name", value: "я".repeat(61) });
      await savePhotoAction({ photo: tooLarge });

      expect(consumeWriteAllowance).not.toHaveBeenCalled();
    });
  });

  describe("when the session can't be checked", () => {
    const UNAVAILABLE = { status: "failed", failure: "unavailable" };

    // implements FR-20, FR-9 of add-author-profiles
    it.each([
      ["saveNameAction", () => saveNameAction({ field: "last_name", value: NAME })],
      ["saveAboutAction", () => saveAboutAction({ about: "Поэт" })],
      ["deleteProfileFieldAction (a name)", () => deleteProfileFieldAction({ field: "first_name" })],
      ["deleteProfileFieldAction (the photo)", () => deleteProfileFieldAction({ field: "photo" })],
    ])("%s returns unavailable without a DAL call", async (_name, run) => {
      vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

      const result = await run();

      expect(result.data).toEqual(UNAVAILABLE);
      for (const write of [writeOwnProfile, clearProfileField, removePhoto, replacePhoto]) {
        expect(write).not.toHaveBeenCalled();
      }
      expect(updateTag).not.toHaveBeenCalled();
    });

    // implements FR-20 of add-author-profiles
    it("savePhotoAction returns unavailable before reading the file's bytes", async () => {
      vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });
      const photo = file(PNG_BYTES, "photo.png", "image/png");
      const slice = vi.spyOn(photo, "slice");

      const result = await savePhotoAction({ photo });

      expect(result.data).toEqual(UNAVAILABLE);
      expect(slice).not.toHaveBeenCalled();
      expect(replacePhoto).not.toHaveBeenCalled();
    });
  });
});
