// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { deletePoemAction } from "../../actions/delete-poem.actions";
import { sendActionNotice } from "../../actions/send-action-notice";
import { deletePoemAsAdmin } from "../../dal/delete-rpc";
import { removeIllustration } from "../../dal/illustration-cleanup";
import { MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import {
  ADMIN_USER_ID,
  AUTHOR_ID,
  expectNothingSecretLogged,
  ILLUSTRATION_PATH,
  POEM_ID,
  POEM_TITLE,
  TARGET_EMAIL,
  TARGET_USER_ID,
} from "../support/rpc-mock";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/delete-rpc", () => ({ deletePoemAsAdmin: vi.fn() }));
vi.mock("../../dal/illustration-cleanup", () => ({ removeIllustration: vi.fn() }));
vi.mock("../../actions/send-action-notice", () => ({ sendActionNotice: vi.fn() }));

const OTHER_AUTHOR_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const SENT = { outcome: "sent" } as const;

const DELETED = {
  ok: true,
  status: "deleted",
  authorId: AUTHOR_ID,
  userId: TARGET_USER_ID,
  illustrationPath: ILLUSTRATION_PATH,
  title: POEM_TITLE,
  noticeEmail: TARGET_EMAIL,
  ground: "harmful-content",
} as const;

/** Nothing past the validation or the session check ran, and no email went out. */
function expectNothingDone(): void {
  expect(deletePoemAsAdmin).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
  expect(removeIllustration).not.toHaveBeenCalled();
  expect(sendActionNotice).not.toHaveBeenCalled();
}

describe("deletePoemAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID, aal: "aal1", amr: [] });
    vi.mocked(deletePoemAsAdmin).mockResolvedValue(DELETED);
    vi.mocked(removeIllustration).mockResolvedValue(undefined);
    vi.mocked(sendActionNotice).mockResolvedValue(SENT);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-8 of admin-moderation
  it("deletes the poem, expires exactly its author's tag, then removes the file", async () => {
    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true, notice: SENT });
    expect(deletePoemAsAdmin).toHaveBeenCalledExactlyOnceWith({ id: POEM_ID });
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    expect(removeIllustration).toHaveBeenCalledExactlyOnceWith(ILLUSTRATION_PATH);
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(removeIllustration).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-8 of admin-moderation
  it("expires the tag of the author the database returned, not one from the input", async () => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ...DELETED, authorId: OTHER_AUTHOR_ID });

    await deletePoemAction({ id: POEM_ID, authorId: AUTHOR_ID } as { id: string });

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${OTHER_AUTHOR_ID}`);
  });

  // implements FR-8 of admin-moderation
  it("removes no file for a poem without an illustration", async () => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ...DELETED, illustrationPath: null });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true, notice: SENT });
    expect(updateTag).toHaveBeenCalledOnce();
    expect(removeIllustration).not.toHaveBeenCalled();
  });

  // implements FR-8 of admin-moderation
  it("answers success after the file removal ran: its failure is the helper's to log, never the delete's", async () => {
    // `removeIllustration` never throws (dal/illustration-cleanup.test.ts pins that), so a failed removal reaches
    // the action as an ordinary return.
    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true, notice: SENT });
    expect(updateTag).toHaveBeenCalledOnce();
    expect(removeIllustration).toHaveBeenCalledExactlyOnceWith(ILLUSTRATION_PATH);
  });

  // implements FR-8, NFR-6 of admin-moderation
  it("keeps the delete when the tag expiry throws, logging the class only", async () => {
    vi.mocked(updateTag).mockImplementation(() => {
      throw new RangeError(`not in an action: ${POEM_TITLE} ${AUTHOR_ID}`);
    });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true, notice: SENT });
    expect(removeIllustration).toHaveBeenCalledExactlyOnceWith(ILLUSTRATION_PATH);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] expire author works tag failed: RangeError");
    expectNothingSecretLogged();
  });

  // implements FR-8 of admin-moderation
  it("answers not-found, expiring, removing and emailing nothing, for a poem that is gone", async () => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason: "not-found" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(removeIllustration).not.toHaveBeenCalled();
    expect(sendActionNotice).not.toHaveBeenCalled();
  });

  // implements FR-9 of moderation-notifications
  it("sends the author one email, last, with the database's title, the author's user id and the ground", async () => {
    await deletePoemAction({ id: POEM_ID, title: "from the browser" } as { id: string });

    expect(sendActionNotice).toHaveBeenCalledExactlyOnceWith({
      kind: "delete-poem",
      userId: TARGET_USER_ID,
      email: TARGET_EMAIL,
      ground: "harmful-content",
      title: POEM_TITLE,
    });
    expect(vi.mocked(removeIllustration).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendActionNotice).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-9 of moderation-notifications
  it("sends the notice with the profile id never standing in for the user id", async () => {
    await deletePoemAction({ id: POEM_ID });

    expect(vi.mocked(sendActionNotice).mock.calls[0]?.[0].userId).not.toBe(AUTHOR_ID);
  });

  // implements FR-14 of moderation-notifications
  it("keeps the delete a success, carrying the failed notice, when the email was not sent", async () => {
    vi.mocked(sendActionNotice).mockResolvedValue({ outcome: "failed", cause: "no-address" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true, notice: { outcome: "failed", cause: "no-address" } });
    expect(updateTag).toHaveBeenCalledOnce();
  });

  // implements FR-12 of admin-moderation
  it.each([POEM_ID.toUpperCase(), "not-an-id", ""])("returns a validation error and does nothing for the id %j", async (id) => {
    const result = await deletePoemAction({ id });

    expect(result.validationErrors).toBeDefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expectNothingDone();
  });

  // implements FR-12 of admin-moderation
  it("says the session ended, and does nothing, when the admin is signed out", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason: "unauthenticated" });
    expectNothingDone();
  });

  // implements FR-12 of admin-moderation
  it("says the service is unavailable, and does nothing, when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason: "unavailable" });
    expectNothingDone();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s apart, expiring, removing and emailing nothing", async (_case, failure, reason) => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ok: false, failure });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason });
    expect(updateTag).not.toHaveBeenCalled();
    expect(removeIllustration).not.toHaveBeenCalled();
    expect(sendActionNotice).not.toHaveBeenCalled();
  });

  // implements NFR-6 of admin-moderation
  it("answers an unexpected throw with the generic message and logs the action and the error class only", async () => {
    vi.mocked(deletePoemAsAdmin).mockRejectedValue(new RangeError(`boom for ${POEM_TITLE} ${POEM_ID}`));

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
  });
});
