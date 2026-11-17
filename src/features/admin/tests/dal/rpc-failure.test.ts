// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";

import { toAdminFailure, withStatus } from "../../dal/rpc-failure";
import {
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
  HTTP_UNAVAILABLE,
  NO_RESPONSE,
  TARGET_EMAIL,
} from "../support/rpc-mock";

const OPERATION = "block user";

/** What the DAL hands the classifier: a PostgREST error reduced to its code, with the response status merged in. */
function postgrestError(code: string, status: number): { code: string; status: number } {
  return { code, status };
}

describe("toAdminFailure", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // implements FR-12 of admin-moderation
  it("reads 42501 on a recognised session as a refused admin check", () => {
    expect(toAdminFailure(OPERATION, postgrestError("42501", HTTP_FORBIDDEN))).toBe("forbidden");
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["42501 behind a 401: the session is gone", postgrestError("42501", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["a rejected JWT", postgrestError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["a 5xx", postgrestError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ["a network failure", postgrestError("", NO_RESPONSE), "unavailable"],
    ["a thrown fetch failure", new TypeError("fetch failed"), "unavailable"],
    ["a code the app does not know", postgrestError("P0002", HTTP_FORBIDDEN), "unknown"],
  ] as const)("classifies %s", (_case, error, failure) => {
    expect(toAdminFailure(OPERATION, error)).toBe(failure);
  });

  // implements NFR-6 of admin-moderation
  it("logs the operation and the PostgREST code, never the message or details", () => {
    toAdminFailure(OPERATION, postgrestError("XX000", HTTP_UNAVAILABLE));

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] block user failed: PostgrestError XX000");
    expectNothingSecretLogged();
  });

  // implements NFR-6 of admin-moderation
  it("logs an error's class name, not its message", () => {
    toAdminFailure(OPERATION, new TypeError(`fetch failed for ${TARGET_EMAIL}`));

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] block user failed: TypeError");
    expectNothingSecretLogged();
  });

  it("adds no log line of its own for a missing Supabase config, which is unavailable", () => {
    expect(toAdminFailure(OPERATION, new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]))).toBe("unavailable");
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("withStatus", () => {
  // implements NFR-6 of admin-moderation
  it("keeps the code and the status and drops the message and details", () => {
    expect(withStatus({ code: "42501" }, HTTP_FORBIDDEN)).toEqual({ code: "42501", status: HTTP_FORBIDDEN });
  });
});
