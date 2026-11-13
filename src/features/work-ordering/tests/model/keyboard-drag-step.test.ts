import { describe, expect, it } from "vitest";

import { resolveKeyboardDrag } from "../../model/keyboard-drag-step";
import { BOARD, poemIds } from "./board-fixtures";

const FIRST_POEM = { item: { type: "poem", id: "a" }, arrangement: BOARD } as const;
const LAST_POEM = { item: { type: "poem", id: "f" }, arrangement: BOARD } as const;
const FIRST_COLLECTION = { item: { type: "collection", id: "autumn" }, arrangement: BOARD } as const;

describe("resolveKeyboardDrag", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("steps a held poem one place down with ArrowDown", () => {
    const outcome = resolveKeyboardDrag("ArrowDown", FIRST_POEM);

    expect(outcome.kind).toBe("moved");
    if (outcome.kind === "moved") expect(poemIds(outcome.arrangement, "autumn")).toEqual(["b", "a", "c"]);
  });

  // implements FR-7 of drag-and-drop-ordering
  it("steps a held collection one place down among collections with ArrowDown", () => {
    const outcome = resolveKeyboardDrag("ArrowDown", FIRST_COLLECTION);

    expect(outcome.kind).toBe("moved");
    if (outcome.kind === "moved") {
      expect(outcome.arrangement.collections.map((collection) => collection.id)).toEqual(["winter", "autumn", "empty"]);
    }
  });

  // implements FR-7 of drag-and-drop-ordering: nothing wraps around at the board's ends
  it("consumes ArrowDown at the end of the board without moving", () => {
    expect(resolveKeyboardDrag("ArrowDown", LAST_POEM)).toEqual({ kind: "consumed" });
  });

  it("consumes ArrowUp at the start of the board without moving", () => {
    expect(resolveKeyboardDrag("ArrowUp", FIRST_COLLECTION)).toEqual({ kind: "consumed" });
  });

  it.each(["ArrowLeft", "ArrowRight"])("consumes %s and moves nothing", (code) => {
    expect(resolveKeyboardDrag(code, FIRST_POEM)).toEqual({ kind: "consumed" });
  });

  it("consumes a vertical arrow when nothing is held", () => {
    expect(resolveKeyboardDrag("ArrowUp", null)).toEqual({ kind: "consumed" });
  });

  it.each(["Space", "Escape", "Tab", "KeyA"])("leaves %s to the library", (code) => {
    expect(resolveKeyboardDrag(code, FIRST_POEM)).toEqual({ kind: "ignored" });
  });
});
