import { describe, expect, it } from "vitest";

import { aboutPageCollectionResponseSchema } from "../../model/about-page.schema";

const VALID_ENTRY = { key: "about_page", title: "About", message: "First.\n\nSecond." };

function response(items: unknown[]) {
  return { greetingCollection: { items } };
}

describe("aboutPageCollectionResponseSchema", () => {
  // implements FR-1 of add-about-page
  it("parses a valid payload and trims every field", () => {
    const parsed = aboutPageCollectionResponseSchema.parse(
      response([{ key: " about_page ", title: "  About  ", message: "\n First.\n\nSecond. \n" }]),
    );

    expect(parsed.greetingCollection.items).toEqual([
      { key: "about_page", title: "About", message: "First.\n\nSecond." },
    ]);
  });

  // implements FR-2 of add-about-page
  it.each([
    ["a missing title", { key: VALID_ENTRY.key, message: VALID_ENTRY.message }],
    ["an empty title", { ...VALID_ENTRY, title: "" }],
    ["a whitespace-only title", { ...VALID_ENTRY, title: " \n\t " }],
    ["a missing message", { key: VALID_ENTRY.key, title: VALID_ENTRY.title }],
    ["an empty message", { ...VALID_ENTRY, message: "" }],
    ["a whitespace-only message", { ...VALID_ENTRY, message: "  \n  " }],
  ])("rejects an entry with %s", (_label, entry) => {
    expect(aboutPageCollectionResponseSchema.safeParse(response([entry])).success).toBe(false);
  });

  // implements FR-2 of add-about-page
  it("rejects data without the greeting collection", () => {
    expect(aboutPageCollectionResponseSchema.safeParse({ somethingElse: [] }).success).toBe(false);
  });
});
