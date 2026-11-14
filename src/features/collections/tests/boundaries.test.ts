// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const COLLECTIONS_DIR = "src/features/collections";
const AUTHORS_DIR = "src/features/authors";
const POEMS_DIR = "src/features/poems";

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

function importOf(feature: string): RegExp {
  return new RegExp(`from ["']@/features/${feature}(/[^"']*)?["']`);
}

const collectionsFiles = sourceFiles(COLLECTIONS_DIR);

describe("collections feature boundaries", () => {
  it("finds the feature's source files", () => {
    expect(collectionsFiles.length).toBeGreaterThan(0);
  });

  // implements NFR-4 of public-collections
  it("contains no client module", () => {
    expect(filesMatching(collectionsFiles, /^\s*["']use client["']/m)).toEqual([]);
  });

  // implements NFR-3 of public-collections
  // implements NFR-4 of admin-moderation
  it.each(["admin", "auth", "collection-management", "poem-management"])("imports nothing from %s", (feature) => {
    expect(filesMatching(collectionsFiles, importOf(feature))).toEqual([]);
  });

  // implements NFR-4 of public-collections
  it("imports no cookie-reading or session-aware Supabase client", () => {
    expect(filesMatching(collectionsFiles, /from ["']@\/shared\/lib\/supabase\/(server|session)["']/)).toEqual([]);
  });

  // implements NFR-4 of public-collections
  it("takes only SupabaseConfigError from the Supabase barrel, so a client added there later can't slip in", () => {
    const allowedBarrelImport = /import \{ SupabaseConfigError \} from ["']@\/shared\/lib\/supabase["'];?/g;
    const anyBarrelImport = /from ["']@\/shared\/lib\/supabase["']/;

    const withoutAllowedImport = collectionsFiles.filter((file) =>
      anyBarrelImport.test(readFileSync(file, "utf8").replace(allowedBarrelImport, "")),
    );

    expect(withoutAllowedImport).toEqual([]);
  });

  // implements NFR-7 of public-collections
  it("adds no raw colour: no hex, rgb(, or arbitrary Tailwind colour value", () => {
    const rawColour = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:bg|text|border|outline|fill|stroke)-\[#?[\w(]/;
    expect(filesMatching(collectionsFiles, rawColour)).toEqual([]);
  });

  // implements NFR-3 of public-collections
  it.each([
    ["authors", AUTHORS_DIR],
    ["poems", POEMS_DIR],
  ])("is never imported by %s, so there is no cycle", (_feature, dir) => {
    expect(filesMatching(sourceFiles(dir), importOf("collections"))).toEqual([]);
  });
});
