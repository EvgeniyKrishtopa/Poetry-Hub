"use server";

import { poemFormSchema } from "../model/poem-form.schema";
import type { CreatePoemResult } from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";

/** Creates one poem for the caller's own public profile (design D7); task 4.4 adds the illustration input. */
export const createPoemAction = poemManagementActionClient
  .inputSchema(poemFormSchema)
  .action(async ({ parsedInput }): Promise<CreatePoemResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });
