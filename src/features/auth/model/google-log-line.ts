/**
 * A Supabase error code (or a thrown error's class name) is one short word of Latin letters, digits and
 * underscores. The callback's `error_code` arrives in a URL anyone can forge, so a value of any other shape
 * may hold an address or a token and is never written to the log (google-sign-in NFR-G1; owner, 2026-11-24).
 */
const SUPABASE_ERROR_CODE_PATTERN = /^\w{1,64}$/;

const UNRECOGNISED_ERROR_CODE = "unrecognised";

/** What a Google sign-in log line reports: a callback outcome or a failed start. A cancel is never logged. */
type GoogleLogEvent = "failed" | "blocked" | "start failed";

/** The one log line for a Google sign-in event: the event and Supabase's error code, nothing personal. */
export function getGoogleLogLine(event: GoogleLogEvent, errorCode: string | null | undefined): string {
  const line = `[auth] google sign-in ${event}`;
  if (errorCode === null || errorCode === undefined || errorCode === "") return line;

  const isSupabaseCode = SUPABASE_ERROR_CODE_PATTERN.test(errorCode);
  const loggedCode = isSupabaseCode ? errorCode : UNRECOGNISED_ERROR_CODE;
  return `${line}: ${loggedCode}`;
}
