// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Every source file that takes part in rendering the trail: the feature and its route slot. */
const TRAIL_SOURCE_DIRS = ["src/features/breadcrumbs", "src/app/@breadcrumbs"];

const SOURCE_FILE = /\.tsx?$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

const files = TRAIL_SOURCE_DIRS.flatMap(sourceFiles);

describe("breadcrumb trail sources", () => {
  it("finds the feature and slot files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // implements NFR-1 of add-breadcrumbs
  it("contain no client module", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/^\s*["']use client["']/m);
    }
  });

  // implements FR-5 of add-breadcrumbs
  it("never import the session-aware auth feature, so the trail is the same for every visitor", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/from ["']@\/features\/auth["']/);
    }
  });
});
