import { describe, expect, it } from "vitest";

import { greetingCollectionResponseSchema } from "./greeting.schema";

function responseWith(item: Record<string, unknown>) {
  return { greetingCollection: { items: [item] } };
}

const validItem = { key: "home", title: "Welcome to Poetry Hub", message: "Hello" };

describe("greetingCollectionResponseSchema", () => {
  // implements FR-4 of add-contentful-home-greeting
  it("parses a valid payload and trims surrounding whitespace", () => {
    const result = greetingCollectionResponseSchema.parse(
      responseWith({ key: " home ", title: "  Welcome to Poetry Hub\n", message: "\tLine one\n\nLine two  " }),
    );

    expect(result.greetingCollection.items[0]).toEqual({
      key: "home",
      title: "Welcome to Poetry Hub",
      message: "Line one\n\nLine two",
    });
  });

  it("accepts an empty items list (not-found is decided by the DAL)", () => {
    expect(greetingCollectionResponseSchema.safeParse({ greetingCollection: { items: [] } }).success).toBe(true);
  });

  it.each([
    ["a missing title", { key: "home", message: "Hello" }],
    ["an empty title", { ...validItem, title: "" }],
    ["a whitespace-only title", { ...validItem, title: "   " }],
    ["a whitespace-only message", { ...validItem, message: " \n\t " }],
    ["a non-string key", { ...validItem, key: 1 }],
  ])("rejects %s", (_label, item) => {
    expect(greetingCollectionResponseSchema.safeParse(responseWith(item)).success).toBe(false);
  });

  it("rejects a response without the greeting collection", () => {
    expect(greetingCollectionResponseSchema.safeParse({}).success).toBe(false);
  });
});
