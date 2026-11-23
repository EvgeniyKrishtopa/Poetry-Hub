"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useId } from "react";

import { Alert } from "@/shared/ui";

import { useHomeEntryList } from "../../hooks/use-home-entry-list";
import { ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";
import { announceDropped, announceMoved, announcePicked } from "../../model/home-entry-announcements";
import {
  HOME_DRAG_MOUSE_DISTANCE_PX,
  HOME_DRAG_TOUCH_HOLD_MS,
  HOME_DRAG_TOUCH_TOLERANCE_PX,
} from "../../model/home-entry.constants";
import { HomeEntryRow } from "../HomeEntryRow/HomeEntryRow";

import type { HomeEntryListProps } from "./HomeEntryList.types";

/**
 * One draggable list of chosen entries (poems or authors): a drop calls the move action, the new order shows at once
 * and returns to the stored one on `stale`, `not-found` or a failure (FR-9). An entry never leaves its list, so the
 * library's plain sortable list is enough; its live region speaks the texts of this page.
 */
export function HomeEntryList({ kind, entries: storedEntries }: HomeEntryListProps) {
  const headingId = useId();
  const dndId = useId();
  const { entries, controlsDisabled, isPending, notice, move, remove } = useHomeEntryList(kind, storedEntries);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: HOME_DRAG_MOUSE_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: HOME_DRAG_TOUCH_HOLD_MS, tolerance: HOME_DRAG_TOUCH_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null) return;
    const dropped = entries.find((entry) => entry.id === active.id);
    const target = entries.find((entry) => entry.id === over.id);
    if (dropped === undefined || target === undefined) return;
    move(dropped, target.position);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 self-stretch" aria-busy={isPending}>
      <h2 id={headingId} className="text-2xl font-semibold">
        {ADMIN_HOME_PAGE_COPY.headings[kind]}
      </h2>
      {notice !== null && <Alert tone={notice.tone}>{notice.text}</Alert>}
      {entries.length === 0 && <p className="text-muted">{ADMIN_HOME_PAGE_COPY.empty[kind]}</p>}
      {entries.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            screenReaderInstructions: { draggable: ADMIN_HOME_PAGE_COPY.dragInstructions },
            announcements: {
              onDragStart: ({ active }) => announcePicked(entries, active.id),
              onDragOver: ({ active, over }) => announceMoved(entries, active.id, over?.id),
              onDragEnd: ({ over }) => announceDropped(entries, over?.id),
              onDragCancel: () => ADMIN_HOME_PAGE_COPY.cancelled,
            },
          }}
        >
          <SortableContext items={entries.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <HomeEntryRow key={entry.id} entry={entry} controlsDisabled={controlsDisabled} onRemove={remove} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
