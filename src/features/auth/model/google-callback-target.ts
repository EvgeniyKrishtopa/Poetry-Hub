import type { GoogleFlow, GoogleSignInResult } from "./auth.types";

/** The callback's `from` parameter as a known origin; any other value is `sign-in` (design D2, D5). */
function parseGoogleFlow(from: string | null): GoogleFlow {
  void from;
  throw new Error("not implemented");
}

/**
 * Where `/auth/callback` sends the browser: always one of a few fixed paths, never a request parameter.
 * Takes the callback's raw `from` and parses it itself, so the route needs nothing else (design D3, D5).
 */
export function getGoogleCallbackTarget(result: GoogleSignInResult, from: string | null): string {
  void result;
  void parseGoogleFlow;
  void from;
  throw new Error("not implemented");
}
