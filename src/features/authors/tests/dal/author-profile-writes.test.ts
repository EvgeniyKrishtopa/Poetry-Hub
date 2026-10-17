// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { clearProfileField, removePhoto, replacePhoto, writeOwnProfile } from "../../dal/author-profile-writes";
import { OWNER_PROFILE_COLUMNS } from "../../model/author.constants";

import { createFakeSupabase, errorResponse, okResponse, type FakeSupabase } from "./fake-supabase";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const OLD_PATH = `${PROFILE_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.png`;
/** The `photo_path` format the table check pins: `<profile id>/<uuid>.png|jpg`. */
const NEW_PATH_PATTERN = new RegExp(`^${PROFILE_ID}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(png|jpg)$`);

const NAME = "Анна";

const ROW = {
  id: PROFILE_ID,
  first_name: NAME,
  last_name: null,
  about: null,
  about_align: "left",
  photo_path: null,
};

const PROFILE = { id: PROFILE_ID, firstName: NAME, lastName: null, about: null, aboutAlign: "left", photoUrl: null };

function photoFile(): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "secret-name.gif", { type: "image/gif" });
}

let supabase: FakeSupabase;

function loggedText(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

describe("author profile writes", () => {
  beforeEach(() => {
    supabase = createFakeSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("writeOwnProfile", () => {
    // implements FR-5, FR-10 of add-author-profiles
    it("ensures the row, then updates it by id with the explicit column list", async () => {
      supabase.onRpc("ensure_my_author_profile", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse(ROW));

      await expect(writeOwnProfile({ first_name: NAME })).resolves.toEqual({ ok: true, profile: PROFILE });
      expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith("ensure_my_author_profile");
      expect(supabase.queries[0]).toEqual([
        ["from", ["author_profiles"]],
        ["update", [{ first_name: NAME }]],
        ["eq", ["id", PROFILE_ID]],
        ["select", [OWNER_PROFILE_COLUMNS]],
        ["single", []],
      ]);
    });

    it("returns the failure without an update when the row can't be ensured", async () => {
      supabase.onRpc("ensure_my_author_profile", errorResponse("", 401));

      await expect(writeOwnProfile({ first_name: NAME })).resolves.toEqual({ ok: false, failure: "unauthenticated" });
      expect(supabase.queries).toHaveLength(0);
    });

    it("returns unknown when the ensure function yields no id", async () => {
      supabase.onRpc("ensure_my_author_profile", okResponse(null));

      await expect(writeOwnProfile({ first_name: NAME })).resolves.toEqual({ ok: false, failure: "unknown" });
      expect(supabase.queries).toHaveLength(0);
    });

    // implements NFR-3 of add-author-profiles
    it("returns a failed update classified by status, and never logs the input", async () => {
      supabase.onRpc("ensure_my_author_profile", okResponse(PROFILE_ID));
      supabase.queueQuery(errorResponse("23514", 400));

      await expect(writeOwnProfile({ first_name: NAME })).resolves.toEqual({ ok: false, failure: "unknown" });
      expect(console.error).toHaveBeenCalledWith("[authors] write profile failed: PostgrestError 23514");
      expect(loggedText()).not.toContain(NAME);
    });

    it("returns unavailable without logging when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

      await expect(writeOwnProfile({ first_name: NAME })).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("clearProfileField", () => {
    // implements FR-10 of add-author-profiles
    it("sets a name to null by id and ends with maybeSingle", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ ...ROW, last_name: "Ахматова", first_name: null }));

      const result = await clearProfileField("first_name");

      expect(result).toMatchObject({ ok: true, profile: { firstName: null, lastName: "Ахматова" } });
      expect(supabase.queries[0]).toEqual([
        ["from", ["author_profiles"]],
        ["update", [{ first_name: null }]],
        ["eq", ["id", PROFILE_ID]],
        ["select", [OWNER_PROFILE_COLUMNS]],
        ["maybeSingle", []],
      ]);
    });

    it("resets the alignment when clearing about", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse(ROW));

      await clearProfileField("about");

      expect(supabase.queries[0]).toContainEqual(["update", [{ about: null, about_align: "left" }]]);
    });

    it("returns saved with no profile and updates nothing when there is no row", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(null));

      await expect(clearProfileField("last_name")).resolves.toEqual({ ok: true, profile: null });
      expect(supabase.queries).toHaveLength(0);
    });

    it("returns no profile when the row vanished or clearing left it empty", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse(null));

      await expect(clearProfileField("first_name")).resolves.toEqual({ ok: true, profile: null });
    });

    it("returns the failure when the id can't be read", async () => {
      supabase.onRpc("my_author_profile_id", errorResponse("", 0));

      await expect(clearProfileField("first_name")).resolves.toEqual({ ok: false, failure: "unavailable" });
    });
  });

  describe("replacePhoto", () => {
    function givenOwnRow(photoPath: string | null) {
      supabase.onRpc("ensure_my_author_profile", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ photo_path: photoPath }));
    }

    // implements FR-12 of add-author-profiles
    it("uploads to a fresh path in the profile's folder, points the row at it, then removes the old file", async () => {
      givenOwnRow(OLD_PATH);
      supabase.queueQuery(okResponse({ ...ROW, photo_path: "new" }));
      const file = photoFile();

      const result = await replacePhoto(file, "png");

      expect(result.ok).toBe(true);
      const [path, body, options] = supabase.bucket.upload.mock.calls[0] as unknown as [string, Blob, object];
      expect(path).toMatch(NEW_PATH_PATTERN);
      expect(path.endsWith(".png")).toBe(true);
      expect(new Uint8Array(await body.arrayBuffer())).toEqual(new Uint8Array(await file.arrayBuffer()));
      expect(options).toEqual({ contentType: "image/png", upsert: false });
      expect(supabase.queries[0]).toContainEqual(["select", ["photo_path"]]);
      expect(supabase.queries[1]).toContainEqual(["update", [{ photo_path: path }]]);
      expect(supabase.queries[1]).toContainEqual(["eq", ["id", PROFILE_ID]]);
      expect(supabase.bucket.remove).toHaveBeenCalledExactlyOnceWith([OLD_PATH]);
    });

    // implements FR-8 of add-author-profiles
    it("stores a JPEG as .jpg with image/jpeg, whatever the file's own type says", async () => {
      givenOwnRow(null);
      supabase.queueQuery(okResponse(ROW));

      const file = photoFile();
      await replacePhoto(file, "jpeg");

      const [path, body, options] = supabase.bucket.upload.mock.calls[0] as unknown as [string, Blob, object];
      expect(path).toMatch(NEW_PATH_PATTERN);
      expect(path.endsWith(".jpg")).toBe(true);
      expect(options).toEqual({ contentType: "image/jpeg", upsert: false });
      // Storage stores a File/Blob body's own type, so the client's File must not be the body.
      expect(body).not.toBe(file);
      expect(body.type).toBe("image/jpeg");
    });

    it("removes nothing when there was no previous photo", async () => {
      givenOwnRow(null);
      supabase.queueQuery(okResponse(ROW));

      await expect(replacePhoto(photoFile(), "png")).resolves.toMatchObject({ ok: true });
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
    });

    it("returns the failure and uploads nothing when the row can't be ensured", async () => {
      supabase.onRpc("ensure_my_author_profile", errorResponse("", 503));

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(supabase.bucket.upload).not.toHaveBeenCalled();
    });

    it("returns the failure and uploads nothing when the current path can't be read", async () => {
      supabase.onRpc("ensure_my_author_profile", okResponse(PROFILE_ID));
      supabase.queueQuery(errorResponse("", 503));

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(supabase.bucket.upload).not.toHaveBeenCalled();
    });

    it("returns unknown and uploads nothing when the row is gone right after it was ensured", async () => {
      supabase.onRpc("ensure_my_author_profile", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse(null));

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unknown" });
      expect(supabase.queries[0]).toContainEqual(["maybeSingle", []]);
      expect(supabase.bucket.upload).not.toHaveBeenCalled();
    });

    it("returns unknown for a malformed photo path row", async () => {
      supabase.onRpc("ensure_my_author_profile", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ photo_path: 7 }));

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unknown" });
    });

    it("returns the upload's failure without touching the row", async () => {
      givenOwnRow(OLD_PATH);
      supabase.bucket.upload.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("upstream"), { name: "StorageApiError", status: 502 }),
      });

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(supabase.queries).toHaveLength(1);
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("[authors] replace photo failed: StorageApiError");
    });

    it("removes the just-uploaded file when the row update fails, and keeps the old one", async () => {
      givenOwnRow(OLD_PATH);
      supabase.queueQuery(errorResponse("23514", 400));

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unknown" });
      const [uploaded] = supabase.bucket.upload.mock.calls[0] as unknown as [string];
      expect(supabase.bucket.remove).toHaveBeenCalledExactlyOnceWith([uploaded]);
    });

    it("still returns ok, logged by name, when removing the old file fails", async () => {
      givenOwnRow(OLD_PATH);
      supabase.queueQuery(okResponse(ROW));
      supabase.bucket.remove.mockResolvedValue({
        data: null,
        error: Object.assign(new Error(OLD_PATH), { name: "StorageApiError", status: 500 }),
      });

      await expect(replacePhoto(photoFile(), "png")).resolves.toMatchObject({ ok: true });
      expect(console.error).toHaveBeenCalledWith("[authors] replace photo failed: StorageApiError");
      expect(loggedText()).not.toContain(OLD_PATH);
    });

    it("still returns ok when removing the old file throws", async () => {
      givenOwnRow(OLD_PATH);
      supabase.queueQuery(okResponse(ROW));
      supabase.bucket.remove.mockRejectedValue(new TypeError("fetch failed"));

      await expect(replacePhoto(photoFile(), "png")).resolves.toMatchObject({ ok: true });
      expect(console.error).toHaveBeenCalledWith("[authors] replace photo failed: TypeError");
    });

    // implements NFR-3 of add-author-profiles
    it("never logs the file's name or bytes", async () => {
      givenOwnRow(OLD_PATH);
      supabase.bucket.upload.mockRejectedValue(new TypeError("fetch failed"));

      await expect(replacePhoto(photoFile(), "png")).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(loggedText()).not.toContain("secret-name");
    });
  });

  describe("removePhoto", () => {
    // implements FR-10 of add-author-profiles
    it("clears the row's path first, then removes the file", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ photo_path: OLD_PATH }));
      supabase.queueQuery(okResponse(ROW));

      await expect(removePhoto()).resolves.toEqual({ ok: true, profile: PROFILE });
      expect(supabase.queries[1]).toEqual([
        ["from", ["author_profiles"]],
        ["update", [{ photo_path: null }]],
        ["eq", ["id", PROFILE_ID]],
        ["select", [OWNER_PROFILE_COLUMNS]],
        ["single", []],
      ]);
      expect(supabase.bucket.remove).toHaveBeenCalledExactlyOnceWith([OLD_PATH]);
    });

    it("returns saved with no profile and touches nothing when there is no row", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(null));

      await expect(removePhoto()).resolves.toEqual({ ok: true, profile: null });
      expect(supabase.queries).toHaveLength(0);
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
    });

    it("returns saved with no profile and touches nothing when the row went away after its id was read", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse(null));

      await expect(removePhoto()).resolves.toEqual({ ok: true, profile: null });
      expect(supabase.queries).toHaveLength(1);
      expect(supabase.queries[0]).toContainEqual(["maybeSingle", []]);
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
    });

    it("leaves the file untouched when clearing the row fails", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ photo_path: OLD_PATH }));
      supabase.queueQuery(errorResponse("", 503));

      await expect(removePhoto()).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
    });

    it("returns the failure when the current path can't be read", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(errorResponse("PGRST301", 401));

      await expect(removePhoto()).resolves.toEqual({ ok: false, failure: "unauthenticated" });
      expect(supabase.queries).toHaveLength(1);
    });

    it("removes no file when there was none", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ photo_path: null }));
      supabase.queueQuery(okResponse(ROW));

      await expect(removePhoto()).resolves.toMatchObject({ ok: true });
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
    });

    it("still returns ok, logged by name, when removing the file fails", async () => {
      supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
      supabase.queueQuery(okResponse({ photo_path: OLD_PATH }));
      supabase.queueQuery(okResponse(ROW));
      supabase.bucket.remove.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("gone"), { name: "StorageApiError", status: 500 }),
      });

      await expect(removePhoto()).resolves.toMatchObject({ ok: true });
      expect(console.error).toHaveBeenCalledWith("[authors] remove photo failed: StorageApiError");
    });

    it("returns the failure when the id can't be read", async () => {
      supabase.onRpc("my_author_profile_id", errorResponse("", 401));

      await expect(removePhoto()).resolves.toEqual({ ok: false, failure: "unauthenticated" });
    });
  });
});
