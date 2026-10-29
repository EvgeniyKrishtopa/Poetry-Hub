// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Where the former home poem search and list could still be referenced. `docs/` joins in task 6.1. */
const SEARCHED_DIRS = ["src", "tests/web-qa-scenarios"];

const SOURCE_FILE = /\.(tsx?|css)$/;

/** This file names every former identifier and text on purpose, so it skips itself. */
const THIS_FILE = "src/app/tests/home-poems-removed.test.ts";

/**
 * Identifiers of the removed home search and list, matched as whole words: a longer name of the poems
 * feature that contains one must not count as it.
 */
const REMOVED_IDENTIFIERS = ["PoemSearch", "PoemList", "PoemCard", "usePoemsUiStore", "poemsListQueryOptions"];

/** Its UI texts and a mock poem title, matched as plain substrings. */
const REMOVED_TEXTS = [
  "Загрузка стихов…",
  "Не удалось загрузить стихи.",
  "По вашему запросу стихов не найдено.",
  "The Road Not Taken",
];

function filesContaining(matches: (content: string) => boolean): string[] {
  return files.filter((file) => matches(readFileSync(file, "utf8")));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path))
    .map((path) => join(dir, path))
    .filter((path) => path !== THIS_FILE);
}

const files = SEARCHED_DIRS.flatMap(sourceFiles);

describe("former home poem search and list", () => {
  it("finds the searched files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // implements FR-10 of add-author-poems
  it.each(REMOVED_IDENTIFIERS)("leave no %s identifier behind", (name) => {
    const wholeWord = new RegExp(`\\b${name}\\b`);
    expect(filesContaining((content) => wholeWord.test(content))).toEqual([]);
  });

  // implements FR-10 of add-author-poems
  it.each(REMOVED_TEXTS)("leave no «%s» text behind", (text) => {
    expect(filesContaining((content) => content.includes(text))).toEqual([]);
  });
});
