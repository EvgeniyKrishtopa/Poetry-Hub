import "server-only";

import type { SecurityEvent, SecurityEventSource } from "./security-log.types";

/** Writes one JSON line for a security event. */
export function logSecurityEvent(event: SecurityEvent, source: SecurityEventSource): void {
  void event;
  void source;
  throw new Error("not implemented");
}
