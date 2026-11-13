// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const FEATURE_DIR = "src/features/work-ordering";
const SRC_DIR = "src";
const INDEX_FILE = "src/features/work-ordering/index.ts";
const ROUTE_FILE = "src/app/(authorized)/account/poems/page.tsx";

/** The features and modules that must not import work-ordering, nor be imported by it. */
const SIBLING_FEATURES = ["collection-management", "poem-management"];

const SOURCE_FILE = /\.tsx?$/;
const IMPORT_OF_WORK_ORDERING = /["']@\/features\/work-ordering(\/[^"']*)?["']/;

/** Production source files under `dir`; tests are left out, since they name patterns and mock modules. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

function filesMatching(files: readonly string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8")));
}

describe("work-ordering boundaries", () => {
  // implements NFR-3 of drag-and-drop-ordering
  it("imports neither poem-management nor collection-management", () => {
    const pattern = new RegExp(`["']@/features/(${SIBLING_FEATURES.join("|")})(/[^"']*)?["']`);

    expect(filesMatching(sourceFiles(FEATURE_DIR), pattern)).toEqual([]);
  });

  // implements NFR-3 of drag-and-drop-ordering
  it("is imported by neither poem-management nor collection-management", () => {
    const files = SIBLING_FEATURES.flatMap((name) => sourceFiles(`src/features/${name}`));

    expect(filesMatching(files, IMPORT_OF_WORK_ORDERING)).toEqual([]);
  });

  // implements NFR-3 of drag-and-drop-ordering: the feature only reaches auth and authors through their public APIs
  it("reaches other features only through auth and authors public APIs", () => {
    const imports = sourceFiles(FEATURE_DIR).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/from\s+["'](@\/features\/[^"']+)["']/g)].map((match) => match[1]),
    );
    const allowed = new Set(["@/features/auth", "@/features/authors"]);

    expect(imports.filter((specifier) => !allowed.has(specifier ?? ""))).toEqual([]);
  });

  // implements NFR-3 of drag-and-drop-ordering: group 7 adds the route as the one importer
  it("is imported by nothing but the route file, outside its own folder", () => {
    const importers = filesMatching(
      sourceFiles(SRC_DIR).filter((file) => !file.startsWith(`${FEATURE_DIR}/`)),
      IMPORT_OF_WORK_ORDERING,
    );

    expect(importers.filter((file) => file !== ROUTE_FILE)).toEqual([]);
  });

  // implements NFR-3 of drag-and-drop-ordering: the public API holds only what the route consumes
  it("exports only the board from its public API", () => {
    const exported = [...readFileSync(INDEX_FILE, "utf8").matchAll(/^export\s+\{([^}]+)\}/gm)].flatMap((match) =>
      (match[1] ?? "").split(",").map((name) => name.trim()),
    );

    expect(exported).toEqual(["WorkBoard"]);
  });
});
