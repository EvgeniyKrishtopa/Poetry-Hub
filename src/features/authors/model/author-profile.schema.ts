import { z } from "zod";

import { IMAGE_MAX_BYTES } from "@/shared/lib/image-file/image-file.constants";
import { trimmedLength } from "@/shared/lib/text/trimmed-length";

import { VALIDATION_MESSAGES } from "./author-messages";
import { ABOUT_MAX_LENGTH, NAME_MAX_LENGTH } from "./author.constants";

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

// A plain (stripping) object: any other key in the request, such as a stale `align`, never reaches the write.
export const saveAboutSchema = z.object({
  about: trimmedText(ABOUT_MAX_LENGTH, VALIDATION_MESSAGES.aboutTooLong),
});

// Only the size is checked here; the type is checked by content in `validateImageFile` (design D4).
export const savePhotoSchema = z.object({
  photo: z
    .instanceof(File, { error: VALIDATION_MESSAGES.required })
    .refine((file) => file.size <= IMAGE_MAX_BYTES, VALIDATION_MESSAGES.photoTooLarge),
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
  photo_path: z.string().nullable(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;
