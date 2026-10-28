import { describe, expect, it } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";

import { classifySupabaseError } from "../classify-error";

describe("classifySupabaseError", () => {
  // implements FR-9 of add-author-profiles
  it.each([
    ["a missing config", new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]), "unavailable"],
    ["an expired JWT (PGRST301)", { code: "PGRST301", message: "JWT expired" }, "unauthenticated"],
    ["failed claims validation (PGRST303)", { code: "PGRST303", message: "JWT claims" }, "unauthenticated"],
    ["an HTTP 401 status", { code: "", status: 401 }, "unauthenticated"],
    ["Storage's InvalidJWT (statusCode 401)", { name: "StorageApiError", statusCode: "401" }, "unauthenticated"],
    ["an auth error with status 401", { name: "AuthApiError", status: 401 }, "unauthenticated"],
    ["a request with no response (status 0)", { code: "", status: 0 }, "unavailable"],
    ["a thrown fetch failure", new TypeError("fetch failed"), "unavailable"],
    ["a Storage network failure", { name: "StorageUnknownError", message: "fetch failed" }, "unavailable"],
    ["a PostgREST 503", { code: "PGRST000", status: 503 }, "unavailable"],
    ["a Storage 500 (statusCode)", { name: "StorageApiError", statusCode: "500" }, "unavailable"],
    ["a Storage 502 (status)", { name: "StorageApiError", status: 502 }, "unavailable"],
    ["permission denied (42501)", { code: "42501", status: 403 }, "unknown"],
    ["a check violation", { code: "23514", status: 400 }, "unknown"],
    ["Storage AccessDenied", { name: "StorageApiError", statusCode: "403" }, "unknown"],
    ["a non-numeric statusCode", { statusCode: "unknown" }, "unknown"],
    ["a plain Error", new Error("boom"), "unknown"],
    ["a string", "boom", "unknown"],
    ["null", null, "unknown"],
  ])("%s → %s", (_case, error, expected) => {
    expect(classifySupabaseError(error)).toBe(expected);
  });
});
