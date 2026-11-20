// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SEO_DIR = "src/features/seo";
const SRC_DIR = "src";
const APP_DIR = "src/app";

/** The features the sitemap composes, each through its index only (seo-metadata design D5). */
const COMPOSED_FEATURES = ["authors", "poems", "collections"];

const SOURCE_FILE = /\.tsx?$/;
const FEATURE_IMPORT = /from ["']@\/features\/([^"'/]+)(\/[^"']*)?["']/g;

/** Production source files under `dir`; tests are left out, since they import mocks and name patterns. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

/** Every `@/features/...` import of a file as `[feature, subpath]`; the subpath is empty for an index import. */
function featureImports(file: string): Array<readonly [feature: string, subpath: string]> {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(FEATURE_IMPORT)].map((match) => [match[1], match[2] ?? ""] as const);
}

const seoFiles = sourceFiles(SEO_DIR);

describe("seo feature boundaries", () => {
  it("finds the feature's source files", () => {
    expect(seoFiles.length).toBeGreaterThan(0);
  });

  // implements NFR-3 of seo-metadata
  it("contains no client module", () => {
    const clientFiles = seoFiles.filter((file) => /^\s*["']use client["']/m.test(readFileSync(file, "utf8")));

    expect(clientFiles).toEqual([]);
  });

  // implements NFR-3 of seo-metadata
  it("imports only the public APIs of authors, poems and collections", () => {
    const stray = seoFiles.flatMap((file) =>
      featureImports(file)
        .filter(([feature, subpath]) => !COMPOSED_FEATURES.includes(feature) || subpath !== "")
        .map(([feature, subpath]) => `${file}: @/features/${feature}${subpath}`),
    );

    expect(stray).toEqual([]);
  });

  // implements NFR-3 of seo-metadata
  it("is imported only by src/app, through its index", () => {
    const importers = sourceFiles(SRC_DIR)
      .filter((file) => !file.startsWith(`${SEO_DIR}/`))
      .flatMap((file) =>
        featureImports(file)
          .filter(([feature]) => feature === "seo")
          .map(([, subpath]) => ({ file, subpath })),
      );

    expect(importers.filter(({ file }) => !file.startsWith(`${APP_DIR}/`))).toEqual([]);
    expect(importers.filter(({ subpath }) => subpath !== "")).toEqual([]);
  });
});
