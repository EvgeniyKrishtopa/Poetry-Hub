import { describe, expect, it } from "vitest";

import type { PublicAuthor } from "../../model/author.types";
import { compareAuthors } from "../../model/compare-authors";

function author(id: string, firstName: string, lastName: string): PublicAuthor {
  return { id, firstName, lastName, about: null, aboutAlign: "left", photoUrl: null };
}

function order(authors: readonly PublicAuthor[]): string[] {
  return [...authors].sort(compareAuthors).map((entry) => entry.id);
}

describe("compareAuthors", () => {
  // implements FR-13 of add-author-profiles
  it("sorts by last name", () => {
    expect(
      order([author("t", "Marina", "Tsvetaeva"), author("a", "Anna", "Akhmatova"), author("p", "Boris", "Pasternak")]),
    ).toEqual(["a", "p", "t"]);
  });

  it("ignores case", () => {
    expect(order([author("upper", "Anna", "Blok"), author("lower", "Anna", "akhmatova")])).toEqual(["lower", "upper"]);
  });

  it("falls back to the first name, case-insensitively", () => {
    expect(order([author("b", "boris", "Ivanov"), author("a", "Anna", "ivanov")])).toEqual(["a", "b"]);
  });

  it("orders identical names by id, so the order is stable", () => {
    expect(order([author("b-id", "Анна", "Ахматова"), author("a-id", "анна", "АХМАТОВА")])).toEqual(["a-id", "b-id"]);
  });

  it("puts Latin before Cyrillic by code point", () => {
    expect(order([author("cyr", "Анна", "Ахматова"), author("lat", "Anna", "Zabolotsky")])).toEqual(["lat", "cyr"]);
  });

  it("compares by code point, not UTF-16 unit, outside the BMP", () => {
    // U+1F319 is above U+FF21, but its first UTF-16 unit (0xD83C) is below it.
    expect(order([author("emoji", "A", "🌙"), author("fullwidth", "A", "Ａ")])).toEqual(["fullwidth", "emoji"]);
  });

  it("puts a prefix before a longer name", () => {
    expect(order([author("long", "A", "Blokov"), author("short", "A", "Blok")])).toEqual(["short", "long"]);
  });
});
