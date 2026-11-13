import type { Arrangement } from "../../model/work-ordering.types";

/** «Осень» holds А, Б, В; «Зима» holds Г; «Пустой» holds nothing; the free poems are Д, Е. */
export const BOARD: Arrangement = {
  collections: [
    {
      id: "autumn",
      title: "Осень",
      poems: [
        { id: "a", title: "А" },
        { id: "b", title: "Б" },
        { id: "c", title: "В" },
      ],
    },
    { id: "winter", title: "Зима", poems: [{ id: "d", title: "Г" }] },
    { id: "empty", title: "Пустой", poems: [] },
  ],
  freePoems: [
    { id: "e", title: "Д" },
    { id: "f", title: "Е" },
  ],
};

export function poemIds(arrangement: Arrangement, collectionId: string | null): string[] {
  if (collectionId === null) return arrangement.freePoems.map((poem) => poem.id);
  return arrangement.collections.find((collection) => collection.id === collectionId)?.poems.map((poem) => poem.id) ?? [];
}
