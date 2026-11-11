import { describe, expect, it } from "vitest";

import { announcementFor } from "../../model/board-announcements";
import { arrangeDrop } from "../../model/arrange-drop";
import { collectionHandleLabel, poemHandleLabel, WORK_BOARD_COPY } from "../../model/work-ordering-messages";

import { BOARD } from "./board-fixtures";

const POEM_A = { type: "poem", id: "a" } as const;

describe("announcementFor, a poem", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("announces the pick-up", () => {
    expect(announcementFor({ kind: "picked", item: POEM_A }, BOARD, BOARD)).toBe("Взято: «А».");
  });

  // implements FR-7 of drag-and-drop-ordering
  it("announces a move inside the same list with the position phrase", () => {
    const after = arrangeDrop(BOARD, { kind: "poem", poemId: "a", from: { kind: "collection", collectionId: "autumn" }, to: { kind: "collection", collectionId: "autumn" }, toIndex: 2 });

    expect(announcementFor({ kind: "moved", item: POEM_A }, BOARD, after)).toBe("«А» — позиция 3 из 3.");
  });

  // implements FR-7 of drag-and-drop-ordering: n and total come from the target list
  it("announces entering another collection with its title, position and total", () => {
    const after = arrangeDrop(BOARD, { kind: "poem", poemId: "a", from: { kind: "collection", collectionId: "autumn" }, to: { kind: "collection", collectionId: "winter" }, toIndex: 0 });

    expect(announcementFor({ kind: "moved", item: POEM_A }, BOARD, after)).toBe(
      "«А» помещено в сборник «Зима», позиция 1 из 2.",
    );
  });

  // implements FR-7 of drag-and-drop-ordering
  it("announces entering the free poems", () => {
    const after = arrangeDrop(BOARD, { kind: "poem", poemId: "a", from: { kind: "collection", collectionId: "autumn" }, to: { kind: "free" }, toIndex: 2 });

    expect(announcementFor({ kind: "moved", item: POEM_A }, BOARD, after)).toBe(
      "«А» помещено в свободные, позиция 3 из 3.",
    );
  });

  // implements FR-7 of drag-and-drop-ordering: the drop itself is not a change of list
  it("announces the drop with the position phrase when the previous step already changed the list", () => {
    const moved = arrangeDrop(BOARD, { kind: "poem", poemId: "a", from: { kind: "collection", collectionId: "autumn" }, to: { kind: "collection", collectionId: "winter" }, toIndex: 0 });

    expect(announcementFor({ kind: "dropped", item: POEM_A }, moved, moved)).toBe("«А» — позиция 1 из 2.");
  });

  // implements FR-7 of drag-and-drop-ordering
  it("announces the cancel", () => {
    expect(announcementFor({ kind: "cancelled", item: POEM_A }, BOARD, BOARD)).toBe("«А» возвращено на прежнее место.");
  });

  it("announces nothing for a poem that is no longer on the board", () => {
    expect(announcementFor({ kind: "moved", item: { type: "poem", id: "gone" } }, BOARD, BOARD)).toBe("");
  });
});

describe("announcementFor, a collection", () => {
  const item = { type: "collection", id: "winter" } as const;

  // implements FR-7 of drag-and-drop-ordering
  it("announces a collection move among the collections, never «помещено в»", () => {
    const after = arrangeDrop(BOARD, { kind: "collection", collectionId: "winter", toIndex: 0 });

    expect(announcementFor({ kind: "moved", item }, BOARD, after)).toBe("«Зима» — позиция 1 из 3.");
  });

  // implements FR-7 of drag-and-drop-ordering
  it("announces the pick-up and the cancel of a collection", () => {
    expect(announcementFor({ kind: "picked", item }, BOARD, BOARD)).toBe("Взято: «Зима».");
    expect(announcementFor({ kind: "cancelled", item }, BOARD, BOARD)).toBe("«Зима» возвращено на прежнее место.");
  });

  it("announces nothing for a collection that is no longer on the board", () => {
    expect(announcementFor({ kind: "moved", item: { type: "collection", id: "gone" } }, BOARD, BOARD)).toBe("");
  });
});

describe("messages", () => {
  // implements FR-7, NFR-6 of drag-and-drop-ordering
  it("names the handles with the title in guillemets", () => {
    expect(collectionHandleLabel("Осень")).toBe("Переместить сборник «Осень»");
    expect(poemHandleLabel("А")).toBe("Переместить произведение «А»");
  });

  // implements NFR-6 of drag-and-drop-ordering: the proposal's UI copy table, verbatim
  it("holds the drop-area and instruction texts verbatim", () => {
    expect(WORK_BOARD_COPY.emptyCollectionArea).toBe("Перетащите сюда произведение.");
    expect(WORK_BOARD_COPY.emptyFreeArea).toBe("Перетащите сюда произведение, чтобы оно не входило ни в один сборник.");
    expect(WORK_BOARD_COPY.keyboardInstructions).toBe(
      "Нажмите пробел, чтобы взять. Стрелками выберите место. Пробел — положить, Escape — отменить.",
    );
  });
});
