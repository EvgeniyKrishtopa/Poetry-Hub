"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { WORK_BOARD_COPY } from "../../model/work-ordering-messages";
import { listDroppableId } from "../WorkBoardIsland/board-drag-ids";
import { BoardPoemItem } from "../BoardPoemItem/BoardPoemItem";

import styles from "./BoardPoemList.module.css";
import type { BoardPoemListProps } from "./BoardPoemList.types";

/**
 * One list of poems: a collection's nested list or the free poems. It is a droppable of its own so a poem can be
 * dropped into it when it is empty; an empty list shows its drop area only while a poem is held (FR-3, FR-4).
 */
export function BoardPoemList({ container, poems, heldPoemId, handlesDisabled }: BoardPoemListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: listDroppableId(container),
    data: { kind: "list", container },
  });
  const isFree = container.kind === "free";
  const isEmpty = poems.length === 0;
  const isPoemHeld = heldPoemId !== null;

  // Nothing to show: an empty list whose drop area isn't needed leaves no markup, and no droppable to hover.
  if (isEmpty && !isPoemHeld) return null;

  const listClass = isFree ? styles.free : styles.nested;
  const areaClass = isFree ? styles.freeArea : styles.collectionArea;
  const areaText = isFree ? WORK_BOARD_COPY.emptyFreeArea : WORK_BOARD_COPY.emptyCollectionArea;

  return (
    <SortableContext items={poems.map((poem) => poem.id)} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className={listClass}>
        {isEmpty ? (
          <li className={`${areaClass} ${isOver ? styles.over : ""}`}>{areaText}</li>
        ) : (
          poems.map((poem) => (
            <BoardPoemItem
              key={poem.id}
              poem={poem}
              isLifted={poem.id === heldPoemId}
              handlesDisabled={handlesDisabled}
            />
          ))
        )}
      </ul>
    </SortableContext>
  );
}
