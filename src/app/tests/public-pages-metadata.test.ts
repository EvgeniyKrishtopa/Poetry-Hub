// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PUBLIC_DIR = "src/app/(public)";
const PAGE_FILE = "page.tsx";

/** `export const metadata` or `export [async ]function generateMetadata`: the two ways a page sets its metadata. */
const METADATA_EXPORT = /^export (?:const metadata\b|(?:async )?function generateMetadata\b)/m;

/** Every `page.tsx` under `(public)`, relative to it ("page.tsx" for the home page). */
function publicPageFiles(): string[] {
  return readdirSync(PUBLIC_DIR, { recursive: true, encoding: "utf8" })
    .filter((path) => path === PAGE_FILE || path.endsWith(`/${PAGE_FILE}`))
    .filter((path) => !path.split("/").includes("tests"))
    .sort();
}

const pageFiles = publicPageFiles();

// A page that sets none would inherit nothing but the title template and the site base from the root layout, with
// no description, canonical or card (design D2).
describe("public pages' metadata", () => {
  it("finds the public pages, the data-driven ones among them", () => {
    expect(pageFiles).toEqual(
      expect.arrayContaining([
        "page.tsx",
        "authors/page.tsx",
        "authors/[id]/page.tsx",
        "authors/[id]/poems/[poemId]/page.tsx",
        "authors/[id]/collections/[collectionId]/page.tsx",
      ]),
    );
  });

  // implements FR-1 of seo-metadata
  it("gives every page file a metadata or generateMetadata export", () => {
    const withoutMetadata = pageFiles.filter((file) => !METADATA_EXPORT.test(readFileSync(join(PUBLIC_DIR, file), "utf8")));

    expect(withoutMetadata).toEqual([]);
  });
});
