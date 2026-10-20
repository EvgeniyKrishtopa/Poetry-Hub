// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const APP_DIR = "src/app";
const PAGE_GROUPS = ["(public)", "(authorized)"];
const SLOT_DIR = join(APP_DIR, "@breadcrumbs");
const PAGE_FILE = "page.tsx";

/** A static slot page's segments, as it passes them: `Promise.resolve(["account", "author"])`. */
const STATIC_SEGMENTS = /Promise\.resolve\((\[[^\]]*\])\)/;

/** URL paths of every `page.tsx` under `dir`, relative to it ("" for the root page). */
function pagePaths(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => path === PAGE_FILE || path.endsWith(`/${PAGE_FILE}`))
    .filter((path) => !path.split("/").includes("tests"))
    .map((path) => path.slice(0, -PAGE_FILE.length).replace(/\/$/, ""));
}

const realPages = PAGE_GROUPS.flatMap((group) => pagePaths(join(APP_DIR, group))).sort();
const slotPages = pagePaths(SLOT_DIR).sort();

// The slot must match on every soft navigation between real pages, or Next keeps the previous trail
// on screen; and a slot page with no real page would make a missing URL look matched (design D1).
describe("@breadcrumbs slot", () => {
  it("finds the real pages", () => {
    expect(realPages).toContain("");
    expect(realPages.length).toBeGreaterThan(1);
  });

  // implements FR-1, FR-7 of add-breadcrumbs
  it("has exactly one slot page per real page, at the same path", () => {
    expect(slotPages).toEqual(realPages);
  });

  // implements FR-6 of add-breadcrumbs
  it("has a default and no catch-all folder, so a URL with no page keeps its HTTP 404", () => {
    const entries = readdirSync(SLOT_DIR, { recursive: true, encoding: "utf8" });

    expect(entries).toContain("default.tsx");
    expect(entries.filter((entry) => entry.split("/").some((part) => part.includes("[...")))).toEqual([]);
  });

  // implements FR-2 of add-breadcrumbs
  it("passes each static slot page's own folder path as its segments", () => {
    for (const path of slotPages.filter((slotPath) => slotPath !== "" && !slotPath.includes("["))) {
      const source = readFileSync(join(SLOT_DIR, path, PAGE_FILE), "utf8");
      const literal = STATIC_SEGMENTS.exec(source)?.[1];
      expect(literal, path).toBeDefined();
      expect(JSON.parse(literal ?? "null"), path).toEqual(path.split("/"));
    }
  });
});
