"use client";

import { useSortable } from "@dnd-kit/sortable";

import { boardPoemPath } from "../../model/board-paths";
import { poemHandleLabel, WORK_BOARD_COPY } from "../../model/work-ordering-messages";
import { BoardRow } from "../BoardRow/BoardRow";

import type { BoardPoemItemProps } from "./BoardPoemItem.types";

/** One poem of a list: a sortable item whose handle is the only drag activator (design D8). */
export function BoardPoemItem({ poem, isLifted, handlesDisabled }: BoardPoemItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: poem.id,
    data: { kind: "poem", id: poem.id },
    attributes: { roleDescription: WORK_BOARD_COPY.draggableRole },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
    >
      <BoardRow
        variant="poem"
        itemId={poem.id}
        title={poem.title}
        href={boardPoemPath(poem.id)}
        handleLabel={poemHandleLabel(poem.title)}
        isLifted={isLifted}
        handleDisabled={handlesDisabled}
        activatorRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
    </li>
  );
}
