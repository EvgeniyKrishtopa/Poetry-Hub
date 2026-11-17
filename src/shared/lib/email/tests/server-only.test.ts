// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MODULE_DIR = "src/shared/lib/email";
const SERVER_ONLY_IMPORT = 'import "server-only";';

/** The module's own source files; its tests folder is left out. */
function moduleSourceFiles(): string[] {
  return readdirSync(MODULE_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(MODULE_DIR, name));
}

describe("email module", () => {
  const files = moduleSourceFiles();

  it("scans the module's files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // implements NFR-3 of admin-violations-feedback
  it("starts every file with the server-only import", () => {
    const offenders = files.filter((file) => !readFileSync(file, "utf8").startsWith(SERVER_ONLY_IMPORT));

    expect(offenders).toEqual([]);
  });
});
