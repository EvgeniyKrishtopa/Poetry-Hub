import type { SupabaseFailure } from "@/shared/lib/supabase/classify-error";

import type { MOVE_DB_STATUS, MOVE_FAILURE_REASON } from "./work-ordering.constants";

/** Why a read or a write failed, in the terms the UI shows: the shared classifier's union. */
export type ServiceFailure = SupabaseFailure;

/** One poem on the board: only what the list shows. */
export interface BoardPoem {
  readonly id: string;
  readonly title: string;
}

/** One of the author's collections with its poems in the author's order. */
export interface BoardCollection {
  readonly id: string;
  readonly title: string;
  readonly poems: readonly BoardPoem[];
}

/** The whole board: the collections in order, then the free poems in order (FR-1). */
export interface Arrangement {
  readonly collections: readonly BoardCollection[];
  readonly freePoems: readonly BoardPoem[];
}

/** A list a poem can be in: a collection, or the free poems. */
export type PoemContainer = { readonly kind: "collection"; readonly collectionId: string } | { readonly kind: "free" };

/** One finished drop: a poem to a place in a list, or a collection to a place among the collections (FR-2 to FR-5). */
export type Drop =
  | {
      readonly kind: "poem";
      readonly poemId: string;
      readonly from: PoemContainer;
      readonly to: PoemContainer;
      readonly toIndex: number;
    }
  | {
      readonly kind: "collection";
      readonly collectionId: string;
      readonly toIndex: number;
    };

/** The board's reads: both must succeed (design D4's failure matrix). */
export type OwnBoardResult =
  | { readonly ok: true; readonly arrangement: Arrangement }
  | {
      readonly ok: false;
      readonly reason: "collections-unavailable" | "poems-unavailable";
    };

/** A move function's answer; `moved` carries the author for the public tag (design D2). */
export type MoveWriteResult =
  | {
      readonly ok: true;
      readonly status: typeof MOVE_DB_STATUS.moved;
      readonly authorId: string;
    }
  | {
      readonly ok: true;
      readonly status: typeof MOVE_DB_STATUS.stale | typeof MOVE_DB_STATUS.notFound;
    }
  | { readonly ok: false; readonly failure: ServiceFailure };

/** What a move action answers (FR-6, FR-11): explicit success, never `null`. */
export type MoveResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: (typeof MOVE_FAILURE_REASON)[keyof typeof MOVE_FAILURE_REASON];
    };

/** The limit step's answer. */
export type WriteAllowance =
  { readonly ok: true } | { readonly ok: false; readonly failure: ServiceFailure | "too-many-moves" };

/** What the author is dragging: a poem or a collection. */
export interface DraggedItem {
  readonly type: "poem" | "collection";
  readonly id: string;
}

/** What a dragged item is over, as the board translates the library's droppable into model terms. */
export type OverTarget =
  | { readonly kind: "poem"; readonly poemId: string }
  | { readonly kind: "collection"; readonly collectionId: string }
  | { readonly kind: "list"; readonly container: PoemContainer };
