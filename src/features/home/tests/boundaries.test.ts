// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const HOME_DIR = "src/features/home";

const SOURCE_FILE = /\.tsx?$/;
const FEATURE_IMPORT = /from ["']@\/features\/([\w-]+)((?:\/[^"']*)?)["']/g;

/** The features `home` may read through their public API: the poem reads and the public author list (design D4). */
const ALLOWED_FEATURES = ["authors", "poems"];

/** Production source files under `dir`; tests are left out, since they mock modules. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

/** Every `@/features/<name><subpath>` import of the files, as `[name, subpath]`. */
function featureImports(files: readonly string[]): Array<readonly [name: string, subpath: string]> {
  return files.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(FEATURE_IMPORT)].map(
      (match) => [match[1] ?? "", match[2] ?? ""] as const,
    ),
  );
}

const homeFiles = sourceFiles(HOME_DIR);
const imports = featureImports(homeFiles);

describe("home feature boundaries", () => {
  it("finds the feature's source files and its imports of other features", () => {
    expect(homeFiles.length).toBeGreaterThan(0);
    expect(imports.length).toBeGreaterThan(0);
  });

  // implements NFR-6 of home-page-sections
  it("imports no admin code", () => {
    const names = imports.map(([name]) => name);

    expect(names).not.toContain("admin");
  });

  // implements NFR-6 of home-page-sections
  it("imports only the authors and poems features", () => {
    const names = new Set(imports.map(([name]) => name));

    expect([...names].filter((name) => !ALLOWED_FEATURES.includes(name))).toEqual([]);
  });

  // implements NFR-6 of home-page-sections
  it("reaches the authors and poems features through their index only, never an internal path", () => {
    const deepImports = imports.filter(([, subpath]) => subpath !== "");

    expect(deepImports).toEqual([]);
  });
});
