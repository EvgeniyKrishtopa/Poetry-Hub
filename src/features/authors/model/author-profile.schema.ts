import { z } from "zod";

// Structure only; the trim, length, and file rules land in task 3.1.
const alignSchema = z.enum(["left", "center", "right"]);

export const saveNameSchema = z.object({
  field: z.enum(["first_name", "last_name"]),
  value: z.string(),
});

export const saveAboutSchema = z.object({
  about: z.string(),
  align: alignSchema,
});

export const savePhotoSchema = z.object({
  photo: z.instanceof(File),
});

export const deleteProfileFieldSchema = z.object({
  field: z.enum(["first_name", "last_name", "about", "photo"]),
});

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
