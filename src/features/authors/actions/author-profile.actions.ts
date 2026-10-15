"use server";

import {
  deleteProfileFieldSchema,
  saveAboutSchema,
  saveNameSchema,
  savePhotoSchema,
} from "../model/author-profile.schema";
import type { ProfileActionResult } from "../model/author.types";

import { authorsActionClient } from "./action-client";

// Each action resolves the user from the session, never from input (NFR-2), and on success
// expires the directory's and the author's cache tags (FR-17).

export const saveNameAction = authorsActionClient
  .inputSchema(saveNameSchema)
  .action(async ({ parsedInput }): Promise<ProfileActionResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });

export const saveAboutAction = authorsActionClient
  .inputSchema(saveAboutSchema)
  .action(async ({ parsedInput }): Promise<ProfileActionResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });

export const savePhotoAction = authorsActionClient
  .inputSchema(savePhotoSchema)
  .action(async ({ parsedInput }): Promise<ProfileActionResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });

export const deleteProfileFieldAction = authorsActionClient
  .inputSchema(deleteProfileFieldSchema)
  .action(async ({ parsedInput }): Promise<ProfileActionResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });
