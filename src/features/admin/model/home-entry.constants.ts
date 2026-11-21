/** At most this many chosen poems and this many chosen authors; the database enforces the same cap (FR-8, FR-10). */
export const HOME_ENTRY_LIMIT = 4;

/** The operation names of the home-choice writes and read, the only thing a failure log line carries about them (NFR-6). */
export const HOME_ENTRY_OPERATION = {
  addPoem: "add home poem",
  addAuthor: "add home author",
  move: "move home entry",
  remove: "remove home entry",
  list: "list home entries",
} as const;
