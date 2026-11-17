// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_DIR = "src";
const SOURCE_FILE = /\.(?:ts|tsx|mjs|cjs|js|jsx)$/;

/**
 * Names and values that mean a Supabase key with more power than the publishable one:
 * the legacy service-role key, a `SUPABASE_SECRET_…` variable, and a `sb_secret_` key value.
 */
const SECRET_KEY_PATTERN = /service[_-]?role|SUPABASE_SECRET|sb_secret_/i;

/** Production source files under `dir`; tests are left out because they name the patterns they look for. */
function productionSourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

describe("no Supabase secret key in the source", () => {
  const files = productionSourceFiles(SOURCE_DIR);

  it("scans the source tree", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // implements NFR-2 of admin-moderation
  it("never reads a service-role or secret key variable under src/", () => {
    const offenders = files.filter((file) => SECRET_KEY_PATTERN.test(readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });

  it("matches the names it is meant to catch", () => {
    for (const sample of ["SUPABASE_SERVICE_ROLE_KEY", "serviceRoleKey", "service-role", "SUPABASE_SECRET_KEY", "sb_secret_abc"]) {
      expect(SECRET_KEY_PATTERN.test(sample)).toBe(true);
    }
    expect(SECRET_KEY_PATTERN.test("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")).toBe(false);
  });
});
