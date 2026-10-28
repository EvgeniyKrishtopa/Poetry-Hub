import { z } from "zod";

import { POEM_FIELD_ERRORS } from "./poem-management-messages";
import { NO_GENRE, TEXT_MAX_LENGTH, TITLE_MAX_LENGTH } from "./poem-management.constants";
import type { PoemFieldErrors, PoemFormField } from "./poem-management.types";

/** `\r\n` and lone `\r`, as browsers send line breaks in a textarea's value. */
const LINE_BREAKS = /\r\n?/g;

/** Leading lines that hold only spaces or tabs: removed, so an indented first line keeps its indent. */
const LEADING_EMPTY_LINES = /^(?:[ \t]*\n)+/;

function normalizeLineBreaks(value: string): string {
  return value.replace(LINE_BREAKS, "\n");
}

/** The title as stored: line breaks normalized, then trimmed (FR-4). */
function normalizeTitle(value: string): string {
  return normalizeLineBreaks(value).trim();
}

/**
 * The text as stored: line breaks normalized, leading empty lines and trailing whitespace removed, so a
 * text that is whitespace only becomes empty (FR-4, design D6).
 */
function normalizeText(value: string): string {
  return normalizeLineBreaks(value).replace(LEADING_EMPTY_LINES, "").trimEnd();
}

/** Length in code points, the measure the counter and the database's `char_length` share. */
function codePointLength(value: string): number {
  return [...value].length;
}

/** The one set of field rules for the form and the action (FR-4, design D6, D7). */
export const poemFormSchema = z.object({
  title: z
    .string({ error: POEM_FIELD_ERRORS.required })
    .transform(normalizeTitle)
    .pipe(
      z
        .string()
        .min(1, POEM_FIELD_ERRORS.required)
        .refine((title) => codePointLength(title) <= TITLE_MAX_LENGTH, POEM_FIELD_ERRORS.titleTooLong),
    ),
  text: z
    .string({ error: POEM_FIELD_ERRORS.required })
    .transform(normalizeText)
    .pipe(
      z
        .string()
        .min(1, POEM_FIELD_ERRORS.required)
        .refine((text) => codePointLength(text) <= TEXT_MAX_LENGTH, POEM_FIELD_ERRORS.textTooLong),
    ),
  // The placeholder option sends "" and fails here; the no-genre option becomes `null` (design D5).
  genreId: z
    .string({ error: POEM_FIELD_ERRORS.required })
    .min(1, POEM_FIELD_ERRORS.required)
    .transform((genreId) => (genreId === NO_GENRE ? null : genreId)),
});

/** @public Scaffold: no importer until the form, task 6.2. */
export type PoemFormInput = z.input<typeof poemFormSchema>;

/**
 * What the create action accepts: the form's raw fields plus the optional illustration. Only the types are
 * checked here; the field rules run inside the action, so every field error reaches the form as the
 * action's own `invalid` result (design D7).
 */
export const createPoemInputSchema = z.object({
  title: z.string(),
  text: z.string(),
  genreId: z.string(),
  illustration: z.instanceof(File).optional(),
});

export type CreatePoemInput = z.output<typeof createPoemInputSchema>;

/** The first message of each invalid field, the shape the form shows under its fields. */
export function toPoemFieldErrors(error: z.ZodError): PoemFieldErrors {
  const fieldErrors: Partial<Record<PoemFormField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (isFormField(field) && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

const FORM_FIELDS: ReadonlySet<unknown> = new Set<PoemFormField>(["title", "text", "genreId", "illustration"]);

function isFormField(value: unknown): value is PoemFormField {
  return FORM_FIELDS.has(value);
}
