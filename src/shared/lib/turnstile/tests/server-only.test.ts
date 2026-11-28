// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_DIR = "src";
const MODULE_DIR = join(SOURCE_DIR, "shared/lib/turnstile");
const SERVER_ONLY_IMPORT = 'import "server-only";';
const SECRET_NAME = "TURNSTILE_SECRET_KEY";
const PUBLIC_SECRET_NAME = `NEXT_PUBLIC_${SECRET_NAME}`;
const TESTS_SEGMENT = "/tests/";

/** The module's own source files; its tests folder is left out. */
function moduleSourceFiles(): string[] {
  return readdirSync(MODULE_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(MODULE_DIR, name));
}

/** Every application source file; tests are left out. */
function applicationSourceFiles(): string[] {
  const entries = readdirSync(SOURCE_DIR, { recursive: true, encoding: "utf8" });
  return entries
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => join(SOURCE_DIR, name))
    .filter((file) => !file.includes(TESTS_SEGMENT));
}

function mentions(file: string, text: string): boolean {
  const source = readFileSync(file, "utf8");
  return source.includes(text);
}

describe("turnstile module", () => {
  const moduleFiles = moduleSourceFiles();
  const sourceFiles = applicationSourceFiles();

  it("scans the module and the application source", () => {
    expect(moduleFiles.length).toBeGreaterThan(0);
    expect(sourceFiles.length).toBeGreaterThan(moduleFiles.length);
  });

  // implements NFR-3 of pre-deploy-security-hardening
  it("starts every file with the server-only import", () => {
    const offenders = moduleFiles.filter((file) => !readFileSync(file, "utf8").startsWith(SERVER_ONLY_IMPORT));

    expect(offenders).toEqual([]);
  });

  // implements NFR-3 of pre-deploy-security-hardening
  it("is the only place that names the secret, and nothing names a public one", () => {
    const outsideModule = sourceFiles.filter((file) => !file.startsWith(MODULE_DIR) && mentions(file, SECRET_NAME));
    const publicNames = sourceFiles.filter((file) => mentions(file, PUBLIC_SECRET_NAME));

    expect(outsideModule).toEqual([]);
    expect(publicNames).toEqual([]);
  });
});
