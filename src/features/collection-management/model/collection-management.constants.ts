/** The title's limit after trimming, in code points: the table's `char_length` check (design D2, D5). */
export const COLLECTION_TITLE_MAX_LENGTH = 80;

/** The description's limit after trimming, in code points (design D2, D5). */
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 1000;

/** The form's fields; also their inputs' `name`, by which the form finds them to move focus (design D5). */
export const COLLECTION_FIELD = {
  title: "title",
  description: "description",
} as const;

/** The fields in form order: focus goes to the first invalid one (FR-3). */
export const COLLECTION_FORM_FIELDS = [COLLECTION_FIELD.title, COLLECTION_FIELD.description] as const;

/** The collections' segment under the poem management path: `/account/poems/collections/…` (design D1). */
export const COLLECTIONS_SEGMENT = "collections";

/** The edit page's segment, `/account/poems/collections/<id>/edit`; this feature's own (design D1, Gate 1 C1). */
export const COLLECTION_EDIT_SEGMENT = "edit";

/** The create action's outcomes (design D5). */
export const CREATE_COLLECTION_STATUS = {
  created: "created",
  invalid: "invalid",
  failed: "failed",
} as const;

/** The update action's outcomes (design D6). */
export const UPDATE_COLLECTION_STATUS = {
  saved: "saved",
  invalid: "invalid",
  notFound: "not-found",
  failed: "failed",
} as const;

/** The delete action's outcomes (design D7). */
export const DELETE_COLLECTION_STATUS = {
  deleted: "deleted",
  notFound: "not-found",
  failed: "failed",
} as const;

/** The leave dialog's two forms: a blocked link, or the header's sign-out (design D12, a copy of poem-management's). */
export const LEAVE_DIALOG_REASON = {
  link: "link",
  signOut: "sign-out",
} as const;
