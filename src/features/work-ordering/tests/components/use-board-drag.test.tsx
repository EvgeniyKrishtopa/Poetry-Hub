import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBoardDrag } from "../../components/SortableWorkBoard/use-board-drag";
import { findPoem } from "../../model/board-lookup";
import { BOARD, poemIds } from "../model/board-fixtures";

// jsdom can't drive the mouse sensor (no layout), so the pointer handlers are called with the events the library
// would pass; the geometry is the library's, the arrangement rules are the model's.

const poemData = (id: string) => ({ current: { kind: "poem", id } });
const POINTER = new MouseEvent("pointerdown");

function startEvent(id: string): DragStartEvent {
  return { active: { id, data: poemData(id) }, activatorEvent: POINTER } as unknown as DragStartEvent;
}

function overEvent(id: string, over: string | null, activatorEvent: Event = POINTER): DragOverEvent {
  return {
    active: { id, data: poemData(id) },
    over: over === null ? null : { id: over, data: poemData(over) },
    activatorEvent,
  } as unknown as DragOverEvent;
}

function endEvent(id: string, over: string | null, activatorEvent: Event = POINTER): DragEndEvent {
  return overEvent(id, over, activatorEvent) as unknown as DragEndEvent;
}

function renderDrag() {
  const onDrop = vi.fn();
  const view = renderHook(() => useBoardDrag({ arrangement: BOARD, handlesDisabled: false, onDrop, stored: null }));
  return { ...view, onDrop };
}

describe("useBoardDrag pointer handlers", () => {
  // implements FR-3 of drag-and-drop-ordering
  it("shows a held poem in the list of the poem it passes over, and drops it there", () => {
    const { result, onDrop } = renderDrag();

    act(() => result.current.dndProps.onDragStart?.(startEvent("a")));
    act(() => result.current.dndProps.onDragOver?.(overEvent("a", "d")));
    expect(poemIds(result.current.arrangement, "winter")).toEqual(["a", "d"]);
    expect(result.current.hoverContainer).toEqual({ kind: "collection", collectionId: "winter" });
    expect(result.current.screenReaderAnnouncement).toBe("«А» помещено в сборник «Зима», позиция 1 из 2.");

    act(() => result.current.dndProps.onDragEnd?.(endEvent("a", "d")));
    expect(onDrop).toHaveBeenCalledExactlyOnceWith({
      kind: "poem",
      poemId: "a",
      from: { kind: "collection", collectionId: "autumn" },
      to: { kind: "collection", collectionId: "winter" },
      toIndex: 0,
    });
    expect(result.current.activeItem).toBeNull();
  });

  // implements FR-5 of drag-and-drop-ordering: a pointer drop on nothing cancels
  it("cancels a pointer drop on nothing: the old arrangement, nothing sent, the cancel announced", () => {
    const { result, onDrop } = renderDrag();

    act(() => result.current.dndProps.onDragStart?.(startEvent("a")));
    act(() => result.current.dndProps.onDragOver?.(overEvent("a", "d")));
    act(() => result.current.dndProps.onDragEnd?.(endEvent("a", null)));

    expect(onDrop).not.toHaveBeenCalled();
    expect(poemIds(result.current.arrangement, "autumn")).toEqual(["a", "b", "c"]);
    expect(result.current.screenReaderAnnouncement).toBe("«А» возвращено на прежнее место.");
  });

  // implements FR-7 of drag-and-drop-ordering: the keyboard path applies each place itself
  it("ignores pointer geometry during a keyboard drag", () => {
    const { result } = renderDrag();
    const keyboard = new KeyboardEvent("keydown");

    act(() => result.current.dndProps.onDragStart?.(startEvent("a")));
    act(() => result.current.dndProps.onDragOver?.(overEvent("a", "d", keyboard)));

    expect(findPoem(result.current.arrangement, "a")?.container).toEqual({ kind: "collection", collectionId: "autumn" });
  });

  // implements FR-7 of drag-and-drop-ordering: a keyboard drop has no geometric target and still drops
  it("drops a keyboard drag that has no over target", () => {
    const { result, onDrop } = renderDrag();
    const keyboard = new KeyboardEvent("keydown");

    act(() => result.current.dndProps.onDragStart?.(startEvent("a")));
    act(() => result.current.dndProps.onDragEnd?.(endEvent("a", null, keyboard)));

    // Nothing moved, so there is nothing to store, and it is a drop, not a cancel.
    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.screenReaderAnnouncement).toBe("«А» — позиция 1 из 3.");
  });

  it("ignores events for an item the board does not know", () => {
    const { result, onDrop } = renderDrag();
    const unknown = { active: { id: "x", data: { current: { kind: "list" } } } } as unknown as DragStartEvent;

    act(() => result.current.dndProps.onDragStart?.(unknown));
    act(() => result.current.dndProps.onDragEnd?.(endEvent("a", "d")));

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.activeItem).toBeNull();
  });
});
