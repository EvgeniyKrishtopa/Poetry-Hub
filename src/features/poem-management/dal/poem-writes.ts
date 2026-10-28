import "server-only";

import type { CanCreatePoemResult, CreateOwnPoemInput, CreateOwnPoemResult } from "../model/poem-management.types";

/** `can_create_poem()`: the limit and public-profile check before any upload (design D2, D7 step 3). */
export async function checkCanCreatePoem(): Promise<CanCreatePoemResult> {
  throw new Error("not implemented");
}

/**
 * Uploads the illustration (if any), then calls `create_my_poem`; removes the upload best-effort on
 * anything but `created` (design D7 steps 6-7).
 */
export async function createOwnPoem(input: CreateOwnPoemInput): Promise<CreateOwnPoemResult> {
  void input;
  throw new Error("not implemented");
}
