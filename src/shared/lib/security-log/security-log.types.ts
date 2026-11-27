import "server-only";

export type SecurityEvent = "sign-in-failed" | "captcha-refused" | "rate-limited" | "admin-refused";

/** The part of the app that saw the event. A closed list, so no input can reach a log line. */
export type SecurityEventSource = "auth" | "contact" | "admin";
