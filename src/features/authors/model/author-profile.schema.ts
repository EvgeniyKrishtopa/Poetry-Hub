import { z } from "zod";

import { VALIDATION_MESSAGES } from "./author-messages";
import { ABOUT_MAX_LENGTH, NAME_MAX_LENGTH, PHOTO_MAX_BYTES } from "./author.constants";
import { trimmedLength } from "./trimmed-length";

const alignSchema = z.enum(["left", "center", "right"], { error: VALIDATION_MESSAGES.invalidAlign });

/** Trimmed, non-empty, and at most `max` code points: what is stored is the trimmed value (FR-8). */
function trimmedText(max: number, tooLongMessage: string) {
  return z
    .string({ error: VALIDATION_MESSAGES.required })
    .trim()
    .min(1, VALIDATION_MESSAGES.required)
    .refine((value) => trimmedLength(value) <= max, tooLongMessage);
}

export const saveNameSchema = z.object({
  field: z.enum(["first_name", "last_name"]),
  value: trimmedText(NAME_MAX_LENGTH, VALIDATION_MESSAGES.nameTooLong),
});

export const saveAboutSchema = z.object({
  about: trimmedText(ABOUT_MAX_LENGTH, VALIDATION_MESSAGES.aboutTooLong),
  align: alignSchema,
});

// Only the size is checked here; the type is checked by content in `validatePhotoFile` (design D4).
export const savePhotoSchema = z.object({
  photo: z
    .instanceof(File, { error: VALIDATION_MESSAGES.required })
    .refine((file) => file.size <= PHOTO_MAX_BYTES, VALIDATION_MESSAGES.photoTooLarge),
});

export const deleteProfileFieldSchema = z.object({
  field: z.enum(["first_name", "last_name", "about", "photo"]),
});

/** An author page's id: anything else is not-found before it can become a cache key (design D5). */
export const authorIdSchema = z.uuid();

/** A row as the DAL selects it with `OWNER_PROFILE_COLUMNS`. */
export const profileRowSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  about: z.string().nullable(),
  about_align: alignSchema,
  photo_path: z.string().nullable(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;
