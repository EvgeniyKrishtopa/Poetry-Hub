// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { metadata } from "../(authorized)/layout";

const ADMIN_DIR = "src/app/(authorized)/admin";
const PAGE_FILE = "page.tsx";
const OWN_METADATA_EXPORT = /export\s+(?:async\s+)?(?:const\s+metadata\b|function\s+generateMetadata\b)/;

/** Every admin route's page file, found by walking the folder so a new admin page is covered too. */
const ADMIN_PAGE_FILES = readdirSync(ADMIN_DIR, { recursive: true, encoding: "utf8" })
  .filter((path) => path === PAGE_FILE || path.endsWith(`/${PAGE_FILE}`))
  .map((path) => join(ADMIN_DIR, path))
  .sort();

describe("the (authorized) layout's metadata", () => {
  // implements FR-6 of seo-metadata
  it("is noindex, nofollow with a plain title", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title).toBeTruthy();
  });

  // implements FR-6 of seo-metadata
  it("carries no description, Open Graph or Twitter card", () => {
    expect(metadata.description).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.twitter).toBeUndefined();
  });

  it("finds the admin pages", () => {
    expect(ADMIN_PAGE_FILES.length).toBeGreaterThanOrEqual(2);
  });

  // implements FR-6 of seo-metadata: an own title on /admin would tell a non-admin that the page exists
  it.each(ADMIN_PAGE_FILES)("is inherited by %s, which exports no metadata of its own", (file) => {
    const source = readFileSync(file, "utf8");

    expect(source).not.toMatch(OWN_METADATA_EXPORT);
  });
});
