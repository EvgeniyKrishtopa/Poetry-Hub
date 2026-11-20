// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_DIR = "src";
const FEATURES_DIR = "src/features";
const METADATA_DIR = "metadata";
const FEATURE_INDEX = "index.ts";

const SOURCE_FILE = /\.tsx?$/;
const SERVER_ONLY_IMPORT = /^import "server-only";/m;
/** An import of anything inside a `metadata/` folder, by any specifier: `@/features/x/metadata/y`, `../metadata/y`. */
const METADATA_IMPORT = /from ["'][^"']*\/metadata\/[^"']*["']/;

/** Production source files under `dir`; tests are left out, since they import the modules they check. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

const featuresWithMetadata = readdirSync(FEATURES_DIR).filter((feature) =>
  existsSync(join(FEATURES_DIR, feature, METADATA_DIR)),
);

const metadataFiles = featuresWithMetadata.flatMap((feature) => sourceFiles(join(FEATURES_DIR, feature, METADATA_DIR)));

describe("feature metadata modules", () => {
  it("finds the features that own a metadata folder", () => {
    expect(featuresWithMetadata).toEqual(
      expect.arrayContaining(["poems", "authors", "collections", "content-page", "home", "auth"]),
    );
    expect(metadataFiles.length).toBeGreaterThan(0);
  });

  // implements NFR-3 of seo-metadata
  it("starts every metadata module with the server-only import", () => {
    const withoutImport = metadataFiles.filter((file) => !SERVER_ONLY_IMPORT.test(readFileSync(file, "utf8")));

    expect(withoutImport).toEqual([]);
  });

  // implements NFR-3 of seo-metadata
  it("contains no client module", () => {
    const clientFiles = metadataFiles.filter((file) => /^\s*["']use client["']/m.test(readFileSync(file, "utf8")));

    expect(clientFiles).toEqual([]);
  });

  // implements NFR-3 of seo-metadata
  it("exports every metadata module through its feature's index", () => {
    const unexported = featuresWithMetadata.flatMap((feature) => {
      const index = readFileSync(join(FEATURES_DIR, feature, FEATURE_INDEX), "utf8");
      return sourceFiles(join(FEATURES_DIR, feature, METADATA_DIR))
        .filter((file) => !index.includes(`./${METADATA_DIR}/${basename(file, ".ts")}"`))
        .map((file) => `${feature}: ${file}`);
    });

    expect(unexported).toEqual([]);
  });

  // implements NFR-3 of seo-metadata: a client file can't reach a metadata module if only the indexes name them
  it("is imported by no file but the owning feature's index", () => {
    const featureIndexes = new Set(featuresWithMetadata.map((feature) => join(FEATURES_DIR, feature, FEATURE_INDEX)));
    const importers = sourceFiles(SRC_DIR).filter(
      (file) => !featureIndexes.has(file) && METADATA_IMPORT.test(readFileSync(file, "utf8")),
    );

    expect(importers).toEqual([]);
  });
});
