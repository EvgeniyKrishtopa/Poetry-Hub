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

/** A `NEXT_PUBLIC_` name for the email key would ship it to every browser. */
const PUBLIC_EMAIL_KEY_PATTERN = /NEXT_PUBLIC_RESEND/i;

/** The email variables; only the server-only email module may read them. */
const EMAIL_VARIABLE_PATTERN = /RESEND_API_KEY|EMAIL_FROM/;
const EMAIL_MODULE_DIR = "src/shared/lib/email/";

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

describe("no email secret outside the server-only email module", () => {
  const files = productionSourceFiles(SOURCE_DIR);

  // implements NFR-1 of admin-violations-feedback
  it("never names a NEXT_PUBLIC_ email key under src/", () => {
    const offenders = files.filter((file) => PUBLIC_EMAIL_KEY_PATTERN.test(readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });

  // implements NFR-1 of admin-violations-feedback
  it("reads the email variables only inside the email module", () => {
    const offenders = files.filter(
      (file) => !file.startsWith(EMAIL_MODULE_DIR) && EMAIL_VARIABLE_PATTERN.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("matches the names it is meant to catch", () => {
    for (const sample of ["NEXT_PUBLIC_RESEND_API_KEY", "next_public_resend_key"]) {
      expect(PUBLIC_EMAIL_KEY_PATTERN.test(sample)).toBe(true);
    }
    for (const sample of ["process.env.RESEND_API_KEY", "process.env.EMAIL_FROM"]) {
      expect(EMAIL_VARIABLE_PATTERN.test(sample)).toBe(true);
    }
    expect(EMAIL_VARIABLE_PATTERN.test("RESEND_KEY_LABEL")).toBe(false);
  });
});
