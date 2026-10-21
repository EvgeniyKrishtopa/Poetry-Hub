import { describe, expect, it } from "vitest";

import { splitParagraphs } from "../split-paragraphs";

// implements FR-1 of add-about-page
describe("splitParagraphs", () => {
  it("splits at one blank line", () => {
    expect(splitParagraphs("first\n\nsecond")).toEqual(["first", "second"]);
  });

  it("treats several blank lines as one boundary", () => {
    expect(splitParagraphs("first\n\n\n\nsecond")).toEqual(["first", "second"]);
  });

  it("treats a whitespace-only line as blank", () => {
    expect(splitParagraphs("first\n  \t\nsecond")).toEqual(["first", "second"]);
  });

  it("keeps a single line break inside one paragraph", () => {
    expect(splitParagraphs("line one\nline two\n\nnext")).toEqual(["line one\nline two", "next"]);
  });

  it("returns the whole text as one paragraph when there is no separator", () => {
    expect(splitParagraphs("just one paragraph")).toEqual(["just one paragraph"]);
  });
});
