"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useId } from "react";

import { Alert, ConnectionNotice } from "@/shared/ui";

import type { Arrangement } from "../../model/work-ordering.types";
import { MOVE_FAILURE_MESSAGES } from "../../model/work-ordering-messages";
import { BoardCollectionItem } from "../BoardCollectionItem/BoardCollectionItem";
import { BoardPoemList } from "../BoardPoemList/BoardPoemList";
import { BoardSectionHeading } from "../BoardSectionHeading/BoardSectionHeading";

import type { SortableWorkBoardProps } from "./SortableWorkBoard.types";
import { useBoardConnection } from "./use-board-connection";
import { useBoardDrag } from "./use-board-drag";
import { useMoveSubmit } from "./use-move-submit";

/**
 * The interactive board: lists, handles, drop areas, the failure alert and the live region. The dropped place is an
 * optimistic arrangement that falls back to the stored one when the move is refused (design D4).
 */
export function SortableWorkBoard({ collections: storedCollections, freePoems: storedFreePoems }: SortableWorkBoardProps) {
  const headingId = useId();
  const { status: connectionStatus, isOnline } = useBoardConnection();

  const storedArrangement: Arrangement = { collections: storedCollections, freePoems: storedFreePoems };
  const { arrangement: shown, isPending, stored, alert, alertRef, submitMove } = useMoveSubmit(storedArrangement);
  const handlesDisabled = isPending || !isOnline;
  const board = useBoardDrag({ arrangement: shown, handlesDisabled, onDrop: submitMove, stored });

  const { collections, freePoems } = board.arrangement;
  const heldPoemId = board.activeItem?.type === "poem" ? board.activeItem.id : null;
  const heldCollectionId = board.activeItem?.type === "collection" ? board.activeItem.id : null;
  const targetCollectionId = board.hoverContainer?.kind === "collection" ? board.hoverContainer.collectionId : null;

  return (
    <div className="flex flex-col gap-4 self-stretch" aria-busy={isPending}>
      <ConnectionNotice status={connectionStatus} />
      {alert !== null && (
        // Focusable by script only: focus lands here after a refused or failed move (FR-6, FR-11).
        <div ref={alertRef} tabIndex={-1}>
          <Alert tone="danger">{MOVE_FAILURE_MESSAGES[alert.reason]}</Alert>
        </div>
      )}
      <DndContext {...board.dndProps}>
        {collections.length > 0 && (
          <section aria-labelledby={headingId} className="flex flex-col gap-4">
            <BoardSectionHeading id={headingId} />
            <SortableContext items={collections.map((collection) => collection.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3">
                {collections.map((collection) => (
                  <BoardCollectionItem
                    key={collection.id}
                    collection={collection}
                    isLifted={collection.id === heldCollectionId}
                    isTarget={collection.id === targetCollectionId}
                    heldPoemId={heldPoemId}
                    handlesDisabled={handlesDisabled}
                  />
                ))}
              </ul>
            </SortableContext>
          </section>
        )}
        <BoardPoemList container={{ kind: "free" }} poems={freePoems} heldPoemId={heldPoemId} handlesDisabled={handlesDisabled} />
      </DndContext>
      {/* The board's own live region: the library's built-in one is silent, so each event is read once (NFR-4). */}
      <div role="status" aria-live="polite" className="sr-only">
        {board.screenReaderAnnouncement}
      </div>
    </div>
  );
}
