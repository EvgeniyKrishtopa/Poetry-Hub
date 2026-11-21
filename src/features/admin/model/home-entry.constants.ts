/** At most this many chosen poems and this many chosen authors; the database enforces the same cap (FR-8, FR-10). */
export const HOME_ENTRY_LIMIT = 4;

/** What the home-choice functions answer (design D2); each function answers only its own subset. */
export const HOME_DB_STATUS = {
  added: "added",
  limitReached: "limit-reached",
  alreadyInList: "already-in-list",
  notFound: "not-found",
  moved: "moved",
  stale: "stale",
  removed: "removed",
} as const;

/** The operation names of the home-choice writes and read, the only thing a failure log line carries about them (NFR-6). */
export const HOME_ENTRY_OPERATION = {
  addPoem: "add home poem",
  addAuthor: "add home author",
  move: "move home entry",
  remove: "remove home entry",
  list: "list home entries",
} as const;
