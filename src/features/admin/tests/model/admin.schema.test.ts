import { describe, expect, it } from "vitest";

import { deleteTargetSchema, listQuerySchema, targetUserSchema } from "../../model/admin.schema";

const TARGET_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

describe("admin input schemas", () => {
  // implements FR-12 of admin-moderation
  it.each([
    ["a uuid", TARGET_ID, true],
    ["a seed-style uuid", "00000000-0000-0000-0000-000000000001", true],
    ["an uppercase uuid", TARGET_ID.toUpperCase(), false],
    ["a short string", "42", false],
    ["an email", "ada@example.com", false],
    ["an empty string", "", false],
  ])("targetUserSchema accepts only a lowercase uuid: %s", (_case, userId, valid) => {
    expect(targetUserSchema.safeParse({ userId }).success).toBe(valid);
  });

  // implements FR-12 of admin-moderation
  it("targetUserSchema and deleteTargetSchema reject a missing target", () => {
    expect(targetUserSchema.safeParse({}).success).toBe(false);
    expect(deleteTargetSchema.safeParse({}).success).toBe(false);
  });

  // implements FR-12 of admin-moderation
  it("deleteTargetSchema accepts a lowercase uuid and nothing else", () => {
    expect(deleteTargetSchema.safeParse({ id: TARGET_ID }).success).toBe(true);
    expect(deleteTargetSchema.safeParse({ id: "not-an-id" }).success).toBe(false);
  });

  // implements FR-3 of admin-moderation
  it("listQuerySchema takes both parameters as optional text and judges neither", () => {
    expect(listQuerySchema.parse({})).toEqual({});
    expect(listQuerySchema.parse({ after: "anything", email: " Ada@Example.com " })).toEqual({
      after: "anything",
      email: " Ada@Example.com ",
    });
  });
});
