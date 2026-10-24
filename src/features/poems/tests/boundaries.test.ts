// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const POEMS_DIR = "src/features/poems";
const AUTHORS_DIR = "src/features/authors";
const SRC_DIR = "src";

/** The one module allowed to read the mock set and its count rule (NFR-3). */
const MOCK_READER = "src/features/poems/dal/author-poems.ts";

const SOURCE_FILE = /\.tsx?$/;

/** Production source files under `dir`; tests are left out, since they import mocks and name patterns. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

function filesMatching(files: readonly string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8")));
}

const poemsFiles = sourceFiles(POEMS_DIR);

describe("poems feature boundaries", () => {
  it("finds the feature's source files", () => {
    expect(poemsFiles.length).toBeGreaterThan(0);
  });

  // implements NFR-1 of add-author-poems
  it("contains no client module", () => {
    expect(filesMatching(poemsFiles, /^\s*["']use client["']/m)).toEqual([]);
  });

  // implements NFR-1 of add-author-poems
  it("imports neither the session-aware auth feature nor Supabase", () => {
    expect(filesMatching(poemsFiles, /from ["']@\/features\/auth["']/)).toEqual([]);
    expect(filesMatching(poemsFiles, /from ["']@\/shared\/lib\/supabase(\/[^"']*)?["']/)).toEqual([]);
  });

  // implements FR-6 of add-author-poems
  it("never redirects, so no visitor is sent to sign in", () => {
    expect(filesMatching(poemsFiles, /import\s*\{[^}]*\bredirect\b[^}]*\}\s*from ["']next\/navigation["']/)).toEqual([]);
  });

  // implements NFR-2 of add-author-poems
  it("is never imported by the authors feature, so there is no cycle", () => {
    expect(filesMatching(sourceFiles(AUTHORS_DIR), /from ["']@\/features\/poems(\/[^"']*)?["']/)).toEqual([]);
  });

  // implements NFR-3 of add-author-poems
  it("lets only the poems DAL read the mock set and its count rule", () => {
    const importers = filesMatching(sourceFiles(SRC_DIR), /from ["'][^"']*\/mock-poem(s|-count)["']/);

    expect(importers).toEqual([MOCK_READER]);
  });
});
