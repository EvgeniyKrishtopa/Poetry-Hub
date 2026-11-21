/** A public poem as the home page needs it: enough for a card or a row, never the text (home-page-sections design D3). */
export interface PoemSummary {
  /** Lowercase UUID. */
  readonly id: string;
  /** The lowercase UUID of the poem's author (a public profile). */
  readonly authorId: string;
  readonly title: string;
  /** The illustration's public URL, or `null` when the poem has none. */
  readonly illustrationUrl: string | null;
  /** ISO timestamp of the poem's creation. */
  readonly createdAt: string;
}

/** Public poems in the order the caller asked for, or why they can't be read (home-page-sections FR-12). */
export type PoemSummariesResult =
  | { readonly ok: true; readonly poems: readonly PoemSummary[] }
  | { readonly ok: false; readonly reason: "unavailable" };
