import { describe, expect, it } from "vitest";

import type { Poem } from "@/features/poems";

import { hasCollectedPoems, nestPublicCollections } from "../../model/nest-public-collections";
import type { PublicCollectionEntry } from "../../model/public-collections.types";

const SPRING_ID = "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d";
const AUTUMN_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

const SPRING: PublicCollectionEntry = { id: SPRING_ID, title: "Весна", description: "Первый снег" };
const AUTUMN: PublicCollectionEntry = { id: AUTUMN_ID, title: "Осенний цикл", description: null };

function poem(id: string, title: string, collectionId: string | null): Poem {
  return {
    id,
    title,
    text: "Текст",
    illustrationUrl: null,
    publishedAt: "2026-10-01",
    genreId: null,
    collectionId,
  };
}

const FREE = poem("30000000-0000-4000-8000-000000000054", "Свободное", null);
const SNOW = poem("30000000-0000-4000-8000-000000000053", "Первый снег", SPRING_ID);
const STATION = poem("30000000-0000-4000-8000-000000000052", "Ночной вокзал", AUTUMN_ID);
const GARDEN = poem("30000000-0000-4000-8000-000000000051", "Осенний сад", AUTUMN_ID);

describe("nestPublicCollections", () => {
  // implements FR-1 and FR-2 of public-collections
  it("puts each poem under its collection, keeping both lists' order, and carries only the title link's fields", () => {
    expect(nestPublicCollections([SPRING, AUTUMN], [FREE, SNOW, STATION, GARDEN])).toEqual([
      { ...SPRING, poems: [{ id: SNOW.id, title: "Первый снег" }] },
      {
        ...AUTUMN,
        poems: [
          { id: STATION.id, title: "Ночной вокзал" },
          { id: GARDEN.id, title: "Осенний сад" },
        ],
      },
    ]);
  });

  // implements FR-9 of drag-and-drop-ordering
  it("keeps the author's order of the collections and of each one's poems, whatever the ids sort to", () => {
    expect(nestPublicCollections([AUTUMN, SPRING], [GARDEN, SNOW, STATION])).toEqual([
      {
        ...AUTUMN,
        poems: [
          { id: GARDEN.id, title: "Осенний сад" },
          { id: STATION.id, title: "Ночной вокзал" },
        ],
      },
      { ...SPRING, poems: [{ id: SNOW.id, title: "Первый снег" }] },
    ]);
  });

  // implements FR-1 of public-collections
  it("drops a collection left with no poems", () => {
    expect(nestPublicCollections([SPRING, AUTUMN], [STATION])).toEqual([
      { ...AUTUMN, poems: [{ id: STATION.id, title: "Ночной вокзал" }] },
    ]);
  });

  // implements FR-1 of public-collections
  it("leaves out a poem whose collection isn't listed", () => {
    expect(nestPublicCollections([AUTUMN], [SNOW, FREE])).toEqual([]);
  });

  it("returns nothing for no collections", () => {
    expect(nestPublicCollections([], [SNOW])).toEqual([]);
  });
});

describe("hasCollectedPoems", () => {
  // implements FR-4 of public-collections
  it("is true when any poem is in a collection", () => {
    expect(hasCollectedPoems([FREE, SNOW])).toBe(true);
  });

  // implements FR-4 of public-collections
  it.each([[[FREE]], [[]]])("is false when no poem is in a collection (%j)", (poems) => {
    expect(hasCollectedPoems(poems)).toBe(false);
  });
});
