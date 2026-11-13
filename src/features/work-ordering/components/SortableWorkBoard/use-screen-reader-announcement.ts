"use client";

import { useState } from "react";

import { screenReaderAnnouncementFor, type ScreenReaderAnnouncementEvent } from "../../model/screen-reader-announcements";
import type { Arrangement } from "../../model/work-ordering.types";

interface UseScreenReaderAnnouncement {
  /** The text of the board's own polite live region. */
  readonly screenReaderAnnouncement: string;
  readonly announceToScreenReader: (event: ScreenReaderAnnouncementEvent, before: Arrangement, after: Arrangement) => void;
}

/** The board's live region text: each drag event is worded by the model and read once (FR-7, NFR-4). */
export function useScreenReaderAnnouncement(): UseScreenReaderAnnouncement {
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState("");

  function announceToScreenReader(event: ScreenReaderAnnouncementEvent, before: Arrangement, after: Arrangement) {
    setScreenReaderAnnouncement(screenReaderAnnouncementFor(event, before, after));
  }

  return { screenReaderAnnouncement, announceToScreenReader };
}
