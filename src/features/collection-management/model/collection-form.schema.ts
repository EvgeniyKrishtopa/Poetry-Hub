import { z } from "zod";

import { trimmedLength } from "@/shared/lib/text/trimmed-length";

import { COLLECTION_FIELD_ERRORS } from "./collection-management-messages";
import { COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_TITLE_MAX_LENGTH } from "./collection-management.constants";
import type { CollectionField, CollectionFieldErrors } from "./collection-management.types";

// The feature's own copy of the poem schema's line-break rule (design D1, D5): repeated, not imported.

/** `\r\n` and lone `\r`, as browsers send line breaks in a textarea's value. */
const LINE_BREAKS = /\r\n?/g;

/** The canonical lowercase UUID spelling the database returns; any other spelling names no collection. */
const LOWERCASE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function normalizeLineBreaks(value: string): string {
  return value.replace(LINE_BREAKS, "\n");
}

/** The title as stored: line breaks normalized, trimmed (design D5). */
export function normalizeCollectionTitle(title: string): string {
  return normalizeLineBreaks(title).trim();
}

/** The description as stored: line breaks normalized, trimmed, blank → `null` (design D2, D5). */
export function normalizeCollectionDescription(description: string): string | null {
  const normalized = normalizeLineBreaks(description).trim();
  return normalized === "" ? null : normalized;
}

/** The one set of field rules for the forms and the actions; lengths in code points, as `char_length` (FR-3). */
export const collectionFormSchema = z.object({
  title: z
    .string({ error: COLLECTION_FIELD_ERRORS.required })
    .transform(normalizeCollectionTitle)
    .pipe(
      z
        .string()
        .min(1, COLLECTION_FIELD_ERRORS.required)
        .refine((title) => trimmedLength(title) <= COLLECTION_TITLE_MAX_LENGTH, COLLECTION_FIELD_ERRORS.titleTooLong),
    ),
  description: z
    .string()
    .transform(normalizeCollectionDescription)
    .pipe(
      z
        .string()
        .nullable()
        .refine(
          (description) => description === null || trimmedLength(description) <= COLLECTION_DESCRIPTION_MAX_LENGTH,
          COLLECTION_FIELD_ERRORS.descriptionTooLong,
        ),
    ),
});

/**
 * Whether `collectionId` can name a collection. A malformed id answers `not-found` from inside the action and
 * the read, never reaching the database (design D4, D6, D7), so the input schemas below check types only.
 */
export function isCollectionId(collectionId: string): boolean {
  return LOWERCASE_UUID.test(collectionId);
}

// The action inputs check types only: the field rules and the id guard run inside each action, so a field
// error reaches the form as the action's own `invalid` result and a malformed id as `not-found` (design D5-D7).

export const createCollectionInputSchema = z.object({ title: z.string(), description: z.string() });

export const updateCollectionInputSchema = z.object({
  collectionId: z.string(),
  title: z.string(),
  description: z.string(),
});

export const deleteCollectionInputSchema = z.object({ collectionId: z.string() });

export type CreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionInputSchema>;

const FORM_FIELDS: ReadonlySet<unknown> = new Set<CollectionField>(["title", "description"]);

function isFormField(value: unknown): value is CollectionField {
  return FORM_FIELDS.has(value);
}

/** The first message of each invalid field, the shape the form shows under its fields. */
export function toCollectionFieldErrors(error: z.ZodError): CollectionFieldErrors {
  const fieldErrors: Partial<Record<CollectionField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (isFormField(field) && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}
