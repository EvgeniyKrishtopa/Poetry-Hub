// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { metadata } from "../(authorized)/layout";

const ADMIN_PAGE_FILES = ["src/app/(authorized)/admin/page.tsx", "src/app/(authorized)/admin/violations/page.tsx"];
const OWN_METADATA_EXPORT = /export\s+(?:async\s+)?(?:const\s+metadata\b|function\s+generateMetadata\b)/;

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

  // implements FR-6 of seo-metadata: an own title on /admin would tell a non-admin that the page exists
  it.each(ADMIN_PAGE_FILES)("is inherited by %s, which exports no metadata of its own", (file) => {
    const source = readFileSync(file, "utf8");

    expect(source).not.toMatch(OWN_METADATA_EXPORT);
  });
});
