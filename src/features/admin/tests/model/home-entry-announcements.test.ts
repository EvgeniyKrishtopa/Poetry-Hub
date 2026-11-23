import { describe, expect, it } from "vitest";

import { ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";
import { announceDropped, announceMoved, announcePicked } from "../../model/home-entry-announcements";
import type { HomeEntry } from "../../model/home-entry.types";

function entry(id: string, position: number, label: string): HomeEntry {
  return { kind: "poem", id, position, shown: true, label, authorName: null };
}

const ENTRIES = [entry("a", 1, "Осень"), entry("b", 2, "Зима"), entry("c", 3, "Весна")];

describe("home entry announcements", () => {
  // implements FR-9 of home-page-sections
  it("names the lifted entry, its place of the total and the keys", () => {
    expect(announcePicked(ENTRIES, "b")).toBe(ADMIN_HOME_PAGE_COPY.picked("Зима", 2, 3));
  });

  // implements FR-9 of home-page-sections
  it("reads the place the held entry passes over", () => {
    expect(announceMoved(ENTRIES, "a", "c")).toBe(ADMIN_HOME_PAGE_COPY.moved(3, 3));
  });

  // implements FR-9 of home-page-sections
  it("stays silent over the held entry's own place, so the lifting text is not replaced before it is read", () => {
    expect(announceMoved(ENTRIES, "b", "b")).toBeUndefined();
  });

  // implements FR-9 of home-page-sections
  it("reads the place an entry is dropped on, and a cancel when nothing is under it", () => {
    expect(announceDropped(ENTRIES, "a")).toBe(ADMIN_HOME_PAGE_COPY.dropped(1, 3));
    expect(announceDropped(ENTRIES, null)).toBe(ADMIN_HOME_PAGE_COPY.cancelled);
  });

  it("says nothing for an id that is not in the list", () => {
    expect(announcePicked(ENTRIES, "x")).toBeUndefined();
    expect(announceMoved(ENTRIES, "a", undefined)).toBeUndefined();
  });
});
