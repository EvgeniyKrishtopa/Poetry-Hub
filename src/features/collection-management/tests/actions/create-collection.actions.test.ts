// @vitest-environment node
import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { createCollectionAction } from "../../actions/create-collection.actions";
import { createOwnCollection } from "../../dal/collection-writes";
import { COLLECTION_FIELD_ERRORS } from "../../model/collection-management-messages";
import { COLLECTION_TITLE_MAX_LENGTH } from "../../model/collection-management.constants";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/collection-writes", () => ({ createOwnCollection: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TITLE = "Осенний цикл";

describe("createCollectionAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(createOwnCollection).mockResolvedValue({ ok: true, status: "created", id: COLLECTION_ID });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-4, FR-15 of add-poem-collections
  it("stores the normalized values, refreshes the client router, and answers the stored title", async () => {
    const result = await createCollectionAction({ title: `  ${TITLE} `, description: " Стихи\r\nоктября " });

    expect(result.data).toEqual({ status: "created", title: TITLE });
    expect(createOwnCollection).toHaveBeenCalledExactlyOnceWith(TITLE, "Стихи\nоктября");
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-3 of add-poem-collections
  it("stores a blank description as none", async () => {
    await createCollectionAction({ title: TITLE, description: "   " });

    expect(createOwnCollection).toHaveBeenCalledExactlyOnceWith(TITLE, null);
  });

  // implements FR-3 of add-poem-collections
  it("repeats the field rules: a blank title answers invalid with no session read and no RPC", async () => {
    const result = await createCollectionAction({ title: "   ", description: "" });

    expect(result.data).toEqual({ status: "invalid", fieldErrors: { title: COLLECTION_FIELD_ERRORS.required } });
    expect(getSessionState).not.toHaveBeenCalled();
    expect(createOwnCollection).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("answers invalid for an over-long title", async () => {
    const result = await createCollectionAction({ title: "a".repeat(COLLECTION_TITLE_MAX_LENGTH + 1), description: "" });

    expect(result.data).toEqual({ status: "invalid", fieldErrors: { title: COLLECTION_FIELD_ERRORS.titleTooLong } });
  });

  // implements FR-4 of add-poem-collections
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "unavailable"],
  ] as const)("answers a %s session as failed: %s, storing nothing", async (state, failure) => {
    vi.mocked(getSessionState).mockResolvedValue({ state } as Awaited<ReturnType<typeof getSessionState>>);

    const result = await createCollectionAction({ title: TITLE, description: "" });

    expect(result.data).toEqual({ status: "failed", failure });
    expect(createOwnCollection).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  // implements FR-4, FR-5 of add-poem-collections
  it.each([
    ["not-public", "not-public"],
    ["over-limit", "too-many-collections"],
  ] as const)("answers the database's %s as failed: %s", async (status, failure) => {
    vi.mocked(createOwnCollection).mockResolvedValue({ ok: true, status });

    const result = await createCollectionAction({ title: TITLE, description: "" });

    expect(result.data).toEqual({ status: "failed", failure });
    expect(refresh).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-poem-collections
  it.each(["unavailable", "unauthenticated", "unknown"] as const)("passes a classified %s failure through", async (failure) => {
    vi.mocked(createOwnCollection).mockResolvedValue({ ok: false, failure });

    const result = await createCollectionAction({ title: TITLE, description: "" });

    expect(result.data).toEqual({ status: "failed", failure });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("never takes an author from the input", async () => {
    await createCollectionAction({ title: TITLE, description: "", authorId: USER_ID } as { title: string; description: string });

    expect(createOwnCollection).toHaveBeenCalledExactlyOnceWith(TITLE, null);
  });
});
