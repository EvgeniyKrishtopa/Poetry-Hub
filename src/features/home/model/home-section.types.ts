/** One card of the featured-poems section: the poem, its author and where the card links (FR-2). */
export interface FeaturedWork {
  readonly id: string;
  readonly title: string;
  readonly authorName: string;
  readonly href: string;
  /** The poem's illustration URL, or `null` for the placeholder cover. */
  readonly coverUrl: string | null;
}

/** One card of the project-authors section (FR-4). */
export interface FeaturedAuthor {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  /** The author's photo URL, or `null` for the avatar placeholder. */
  readonly photoUrl: string | null;
  /** A plain-text excerpt of the author's about text (at most `AUTHOR_DESCRIPTION_MAX_LENGTH`), or `null` when there is none. */
  readonly description: string | null;
}

/** One row of the latest-publications section (FR-5). */
export interface LatestWork {
  readonly id: string;
  readonly title: string;
  readonly authorName: string;
  readonly href: string;
}

/** The admin's choice, in position order; the `home_featured_ids` function returns only entries of public authors. */
export interface HomeFeaturedIds {
  readonly poemIds: readonly string[];
  readonly authorIds: readonly string[];
}

/** The chosen ids, or that they could not be read. Never thrown (FR-7). */
export type HomeFeaturedIdsResult =
  | { readonly ok: true; readonly ids: HomeFeaturedIds }
  | { readonly ok: false };

/** What a data section gets: its items (possibly none), or a failure. Both an empty and a failed section render nothing (FR-7). */
export type SectionResult<Item> =
  | { readonly ok: true; readonly items: readonly Item[] }
  | { readonly ok: false };
