// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseConfig } from "../config";
import { SupabaseConfigError } from "../errors";

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
const VALID_URL = "https://abc.supabase.co";
const VALID_KEY = "sb_publishable_known-key";

function captureError(): SupabaseConfigError {
  try {
    getSupabaseConfig();
  } catch (error) {
    if (error instanceof SupabaseConfigError) return error;
    throw error;
  }
  throw new Error("expected getSupabaseConfig to throw");
}

describe("getSupabaseConfig", () => {
  beforeEach(() => {
    vi.stubEnv(URL_VAR, VALID_URL);
    vi.stubEnv(KEY_VAR, VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-8 of add-supabase-auth
  it.each([VALID_URL, "http://127.0.0.1:54321", "http://localhost:54321"])(
    "accepts %s",
    (url) => {
      vi.stubEnv(URL_VAR, url);

      expect(getSupabaseConfig()).toEqual({ url, publishableKey: VALID_KEY });
    },
  );

  it("names both variables without either value when the URL is unset and the key has a space", () => {
    const badKey = "  has space";
    vi.stubEnv(URL_VAR, undefined);
    vi.stubEnv(KEY_VAR, badKey);

    const error = captureError();

    expect(error.message).toContain(URL_VAR);
    expect(error.message).toContain(KEY_VAR);
    expect(error.message).not.toContain(badKey);
    expect(error.variables).toEqual([URL_VAR, KEY_VAR]);
    expect(error.cause).toBeUndefined();
  });

  it.each([
    "http://example.com",
    "ftp://abc.supabase.co",
    "not a url",
    "http://localhost.evil.com",
    "http://localhost@evil.com",
  ])(
    "rejects %s, naming only the URL variable",
    (url) => {
      vi.stubEnv(URL_VAR, url);

      const error = captureError();

      expect(error.message).toContain(URL_VAR);
      expect(error.message).not.toContain(KEY_VAR);
      expect(error.message).not.toContain(url);
    },
  );

  it("rejects an empty key", () => {
    vi.stubEnv(KEY_VAR, "");

    expect(captureError().variables).toEqual([KEY_VAR]);
  });

  it("reads the environment lazily on every call", () => {
    expect(getSupabaseConfig().url).toBe(VALID_URL);

    vi.stubEnv(URL_VAR, "https://other.supabase.co");

    expect(getSupabaseConfig().url).toBe("https://other.supabase.co");
  });
});
