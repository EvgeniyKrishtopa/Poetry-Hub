import type { GoogleCallbackUser } from "./auth.types";

/** Whether the account existed before this sign-in, from two timestamps of the same user record (design D4). */
export function didAccountExist(user: GoogleCallbackUser): boolean {
  void user;
  throw new Error("not implemented");
}
