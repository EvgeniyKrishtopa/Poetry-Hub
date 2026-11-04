import type { SupabaseFailure } from "@/shared/lib/supabase/classify-error";

import type {
  CREATE_COLLECTION_STATUS,
  DELETE_COLLECTION_STATUS,
  LEAVE_DIALOG_REASON,
  UPDATE_COLLECTION_STATUS,
} from "./collection-management.constants";

/** Why a read or a write failed, in the terms the UI shows (design D12: the shared classifier's union). */
export type ServiceFailure = SupabaseFailure;

/** One row of the `/account/poems` section: only what the list shows (design D3, D4). */
export interface CollectionSummary {
  readonly id: string;
  readonly title: string;
}

/** One of the author's own collections, as its page and edit page show it (design D4). */
export interface OwnCollection {
  readonly id: string;
  readonly title: string;
  /** `null` when the collection has no description; never an empty string (design D2). */
  readonly description: string | null;
}

export type OwnCollectionsResult =
  | { readonly ok: true; readonly collections: readonly CollectionSummary[] }
  | { readonly ok: false };

export type OwnCollectionResult =
  | { readonly ok: true; readonly collection: OwnCollection }
  | { readonly ok: false; readonly reason: "not-found" | "unavailable" };

export type OwnCollectionTitleResult =
  | { readonly ok: true; readonly title: string }
  | { readonly ok: false; readonly reason: "not-found" | "unavailable" };

export type CollectionField = "title" | "description";

export type CollectionFieldErrors = Readonly<Partial<Record<CollectionField, string>>>;

export type CreateCollectionFailure = ServiceFailure | "not-public" | "too-many-collections";

export type CreateCollectionResult =
  | { readonly status: typeof CREATE_COLLECTION_STATUS.created; readonly title: string }
  | { readonly status: typeof CREATE_COLLECTION_STATUS.invalid; readonly fieldErrors: CollectionFieldErrors }
  | { readonly status: typeof CREATE_COLLECTION_STATUS.failed; readonly failure: CreateCollectionFailure };

export type UpdateCollectionFailure = ServiceFailure | "too-many-saves" | "not-public";

export type UpdateCollectionResult =
  | { readonly status: typeof UPDATE_COLLECTION_STATUS.saved }
  | { readonly status: typeof UPDATE_COLLECTION_STATUS.invalid; readonly fieldErrors: CollectionFieldErrors }
  | { readonly status: typeof UPDATE_COLLECTION_STATUS.notFound }
  | { readonly status: typeof UPDATE_COLLECTION_STATUS.failed; readonly failure: UpdateCollectionFailure };

export type DeleteCollectionResult =
  | { readonly status: typeof DELETE_COLLECTION_STATUS.deleted; readonly title: string }
  | { readonly status: typeof DELETE_COLLECTION_STATUS.notFound }
  | { readonly status: typeof DELETE_COLLECTION_STATUS.failed; readonly failure: ServiceFailure };

/** `create_my_collection()`'s answer, or a classified failure (design D2, D5). */
export type CreateOwnCollectionResult =
  | { readonly ok: true; readonly status: "created"; readonly id: string }
  | { readonly ok: true; readonly status: "not-public" | "over-limit" }
  | { readonly ok: false; readonly failure: ServiceFailure };

export interface UpdateOwnCollectionInput {
  readonly collectionId: string;
  readonly title: string;
  readonly description: string | null;
}

/** `update_my_collection()`'s answer, or a classified failure (design D2, D6). */
export type UpdateOwnCollectionResult =
  | { readonly ok: true; readonly status: "updated" | "not-found" }
  | { readonly ok: false; readonly failure: ServiceFailure };

/** `delete_my_collection()`'s answer: the stored title on `deleted`, or a classified failure (design D2, D7). */
export type DeleteOwnCollectionResult =
  | { readonly ok: true; readonly status: "deleted"; readonly title: string }
  | { readonly ok: true; readonly status: "not-found" }
  | { readonly ok: false; readonly failure: ServiceFailure };

/** The `collection_edit` scope's answer (design D2, D6). */
export type CollectionEditAllowance =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: ServiceFailure | "too-many-saves" };

/** What `/account/poems` shows once after a write (design D8). */
export type CollectionListNotice =
  | { readonly kind: "created" | "deleted"; readonly title: string }
  | { readonly kind: "already-deleted" };

/** The collection just saved: the saved notice shows on that collection's page only (design D8). */
export interface SavedCollectionNotice {
  readonly collectionId: string;
}

export type LeaveDialogReason = (typeof LEAVE_DIALOG_REASON)[keyof typeof LEAVE_DIALOG_REASON];
