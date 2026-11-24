// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_DIR = "src";
const SOURCE_FILE = /\.tsx?$/;

// Built from two parts so that this file does not contain the key it searches for.
const OLD_HERO_KEY = ["home", "greeting"].join("_");

/** Every TypeScript file under `dir`, tests included: a test that names the key would bring it back too. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path))
    .map((path) => join(dir, path));
}

const files = sourceFiles(SOURCE_DIR);

describe("the retired hero greeting key", () => {
  it("finds the source files it searches", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // implements home-greeting FR-5 of home-contentful-content
  it("is named nowhere in src", () => {
    const filesNamingKey = files.filter((file) => readFileSync(file, "utf8").includes(OLD_HERO_KEY));

    expect(filesNamingKey).toEqual([]);
  });
});
