// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { checkCollectionPoemsAction } from "../../actions/check-collection-poems.actions";
import { getCollectionPoemChoices } from "../../dal/collection-poems";
import { consumeCollectionPoemsSaveAllowance } from "../../dal/collection-poems-allowance";
import { getOwnCollection } from "../../dal/own-collections";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/own-collections", () => ({ getOwnCollection: vi.fn() }));
vi.mock("../../dal/collection-poems", () => ({ getCollectionPoemChoices: vi.fn() }));
vi.mock("../../dal/collection-poems-allowance", () => ({ consumeCollectionPoemsSaveAllowance: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const POEM_ID = "1a2b3c4d-0000-4000-8000-000000000001";

const INPUT = { collectionId: COLLECTION_ID } as const;

describe("checkCollectionPoemsAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(getOwnCollection).mockResolvedValue({
      ok: true,
      collection: { id: COLLECTION_ID, title: "Осенний цикл", description: null },
    });
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({
      ok: true,
      choices: [{ id: POEM_ID, title: "Листопад", selected: false }],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-3 of add-poems-to-collections
  it("answers ready when the own collection has something to manage, counting nothing", async () => {
    const result = await checkCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "ready" });
    expect(getOwnCollection).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(getCollectionPoemChoices).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(consumeCollectionPoemsSaveAllowance).not.toHaveBeenCalled();
  });

  it("runs the steps in order: session, collection, choices", async () => {
    await checkCollectionPoemsAction(INPUT);

    const order = [getSessionState, getOwnCollection, getCollectionPoemChoices].map(
      (mock) => vi.mocked(mock).mock.invocationCallOrder[0] ?? 0,
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  // implements FR-3 of add-poems-to-collections
  it.each([
    ["an uppercase id", COLLECTION_ID.toUpperCase()],
    ["junk", "abc"],
  ])("answers not-found for %s with no other step", async (_case, collectionId) => {
    const result = await checkCollectionPoemsAction({ collectionId });

    expect(result.data).toEqual({ status: "not-found" });
    expect(getSessionState).not.toHaveBeenCalled();
    expect(getOwnCollection).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poems-to-collections
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "unavailable"],
  ] as const)("answers a %s session as failed: %s, reading nothing", async (state, failure) => {
    vi.mocked(getSessionState).mockResolvedValue({ state } as Awaited<ReturnType<typeof getSessionState>>);

    const result = await checkCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure });
    expect(getOwnCollection).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poems-to-collections
  it("answers not-found for a collection gone, not own, or behind a non-public profile, with no choices read", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "not-found" });

    const result = await checkCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "not-found" });
    expect(getCollectionPoemChoices).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poems-to-collections
  it("answers failed: unavailable when the collection read fails", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "unavailable" });

    const result = await checkCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(getCollectionPoemChoices).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poems-to-collections
  it("answers failed: unavailable when the choices read fails", async () => {
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: false });

    const result = await checkCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
  });

  // implements FR-3 of add-poems-to-collections
  it("answers nothing-to-manage for no choices", async () => {
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: true, choices: [] });

    const result = await checkCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "nothing-to-manage" });
  });
});
