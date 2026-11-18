import type { DndContextProps } from "@dnd-kit/core";

import { ADMIN_VIOLATION_COPY } from "../../model/admin-messages";

// The library's own live region stays silent: its texts are English, and the result notice that follows a drop is
// itself a live region, so nothing is lost.
const SILENT_ANNOUNCEMENTS: NonNullable<DndContextProps["accessibility"]>["announcements"] = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

export const VIOLATION_DND_ACCESSIBILITY: NonNullable<DndContextProps["accessibility"]> = {
  screenReaderInstructions: { draggable: ADMIN_VIOLATION_COPY.dragInstructions },
  announcements: SILENT_ANNOUNCEMENTS,
  restoreFocus: false,
};
