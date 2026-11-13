"use client";

import { useSortable } from "@dnd-kit/sortable";

import { boardCollectionPath } from "../../model/board-paths";
import { collectionHandleLabel, WORK_BOARD_COPY } from "../../model/work-ordering-messages";
import { BoardPoemList } from "../BoardPoemList/BoardPoemList";
import { BoardRow } from "../BoardRow/BoardRow";

import styles from "./BoardCollectionItem.module.css";
import type { BoardCollectionItemProps } from "./BoardCollectionItem.types";

/** One collection: a sortable item whose handle is its only drag activator, holding its own nested poem list. */
export function BoardCollectionItem({
  collection,
  isLifted,
  isTarget,
  heldPoemId,
  handlesDisabled,
}: BoardCollectionItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: collection.id,
    data: { kind: "collection", id: collection.id },
    attributes: { roleDescription: WORK_BOARD_COPY.draggableRole },
  });
  const stateClass = [isLifted ? styles.lifted : "", isTarget ? styles.target : ""].join(" ");

  return (
    <li
      ref={setNodeRef}
      className={`${styles.collection} ${stateClass}`}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
    >
      <BoardRow
        variant="collection"
        itemId={collection.id}
        title={collection.title}
        href={boardCollectionPath(collection.id)}
        handleLabel={collectionHandleLabel(collection.title)}
        // The whole collection box is drawn lifted, so its own row stays plain.
        isLifted={false}
        handleDisabled={handlesDisabled}
        activatorRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
      <BoardPoemList
        container={{ kind: "collection", collectionId: collection.id }}
        poems={collection.poems}
        heldPoemId={heldPoemId}
        handlesDisabled={handlesDisabled}
      />
    </li>
  );
}
