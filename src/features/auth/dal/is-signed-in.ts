import "server-only";

import { getCurrentUserId } from "./current-user";

/**
 * Whether the request carries a valid session, for the header (design D1). Returns a boolean,
 * never claims, so no reader data enters the render tree. Never throws: every failure reads
 * as signed out.
 */
export async function isSignedIn(): Promise<boolean> {
  return (await getCurrentUserId()) !== null;
}
