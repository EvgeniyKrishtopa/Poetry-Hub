// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listCollectedPoems } from "../../dal/collection-poems";
import { listOwnCollections } from "../../dal/own-collections";
import { listOwnCollectionsWithPoems } from "../../dal/own-collections-with-poems";

vi.mock("../../dal/own-collections", () => ({ listOwnCollections: vi.fn() }));
vi.mock("../../dal/collection-poems", () => ({ listCollectedPoems: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const SPRING_ID = "40000000-0000-4000-8000-000000000002";
const EMPTY_ID = "40000000-0000-4000-8000-000000000003";
const SPRING_POEM = { collectionId: SPRING_ID, id: "50000000-0000-4000-8000-000000000001", title: "Капель" };

beforeEach(() => {
  vi.mocked(listOwnCollections).mockResolvedValue({
    ok: true,
    collections: [
      { id: SPRING_ID, title: "Весна" },
      { id: EMPTY_ID, title: "Пустой" },
    ],
  });
  vi.mocked(listCollectedPoems).mockResolvedValue({ ok: true, poems: [SPRING_POEM] });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("listOwnCollectionsWithPoems", () => {
  // implements FR-11 of add-poems-to-collections
  it("returns the author's collections with each one's poems nested under it", async () => {
    await expect(listOwnCollectionsWithPoems(AUTHOR_ID)).resolves.toEqual({
      ok: true,
      collections: [
        { id: SPRING_ID, title: "Весна", poems: [SPRING_POEM] },
        { id: EMPTY_ID, title: "Пустой", poems: [] },
      ],
    });
    expect(listOwnCollections).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
  });

  // implements FR-11 of add-poems-to-collections
  it("starts both reads before either answers", async () => {
    vi.mocked(listOwnCollections).mockReturnValue(new Promise(() => {}));

    void listOwnCollectionsWithPoems(AUTHOR_ID);
    await vi.waitFor(() => expect(listCollectedPoems).toHaveBeenCalledOnce());

    expect(listOwnCollections).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
  });

  // implements FR-2 of add-poem-collections, FR-11 of add-poems-to-collections
  it.each([
    ["the collections", () => vi.mocked(listOwnCollections).mockResolvedValue({ ok: false })],
    ["the collected poems", () => vi.mocked(listCollectedPoems).mockResolvedValue({ ok: false })],
  ])("fails the whole list when %s can't be read", async (_case, arrange) => {
    arrange();

    await expect(listOwnCollectionsWithPoems(AUTHOR_ID)).resolves.toEqual({ ok: false });
  });
});
