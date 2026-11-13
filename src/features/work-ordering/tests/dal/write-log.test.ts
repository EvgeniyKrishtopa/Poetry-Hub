// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";

import { logFailure, toServiceFailure, withStatus } from "../../dal/write-log";

const OPERATION = "move poem";
const HTTP_UNAVAILABLE = 503;
const NO_RESPONSE = 0;
const CONFIG_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";
const SECRET = "Осенний цикл 9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logFailure", () => {
  // implements NFR-7 of drag-and-drop-ordering
  it.each([
    ["an Error by its class name", new TypeError(SECRET), "TypeError"],
    ["a plain object by its name", { name: "StorageUnknownError", message: SECRET }, "StorageUnknownError"],
    ["a PostgREST error by its code", { code: "23514", message: SECRET, details: SECRET }, "PostgrestError 23514"],
    ["a PostgREST error with an empty code", { code: "", message: SECRET }, "PostgrestError"],
    ["anything else by its type", SECRET, "string"],
  ])("logs %s, never the message", (_case, error, kind) => {
    logFailure(OPERATION, error);

    expect(loggedText()).toBe(`[work-ordering] ${OPERATION} failed: ${kind}`);
    expect(loggedText()).not.toContain(SECRET);
  });

  it("logs nothing for a missing config, which the proxy already logs", () => {
    logFailure(OPERATION, new SupabaseConfigError([CONFIG_VARIABLE]));

    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("toServiceFailure", () => {
  it("logs and classifies", () => {
    expect(toServiceFailure(OPERATION, withStatus({ code: "XX000" }, HTTP_UNAVAILABLE))).toBe("unavailable");
    expect(loggedText()).toBe(`[work-ordering] ${OPERATION} failed: PostgrestError XX000`);
  });
});

describe("withStatus", () => {
  // implements NFR-7 of drag-and-drop-ordering
  it("keeps the code and the status only, dropping the message and details", () => {
    const error = { code: "PGRST301", message: SECRET, details: SECRET } as { readonly code?: string };

    expect(withStatus(error, NO_RESPONSE)).toEqual({ code: "PGRST301", status: NO_RESPONSE });
  });
});
