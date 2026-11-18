import { describe, expect, it } from "vitest";

import { WARNING_MESSAGE_MAX_LENGTH } from "../../model/violation.constants";
import {
  addViolationCaseForAuthorSchema,
  addViolationCaseSchema,
  caseIdSchema,
  sendWarningSchema,
  setCaseGroundSchema,
} from "../../model/violation.schema";
import { AUTHOR_PROFILE_ID, CASE_ID, POEM_ID, TARGET_USER_ID } from "../support/rpc-mock";

describe("sendWarningSchema", () => {
  // implements FR-6 of admin-violations-feedback
  it("keeps the message trimmed", () => {
    expect(sendWarningSchema.parse({ caseId: CASE_ID, message: "  Здравствуйте  \n" })).toEqual({
      caseId: CASE_ID,
      message: "Здравствуйте",
    });
  });

  // implements FR-6 of admin-violations-feedback
  it.each(["", "   ", "\n\t "])("refuses the empty or whitespace-only message %j", (message) => {
    expect(sendWarningSchema.safeParse({ caseId: CASE_ID, message }).success).toBe(false);
  });

  // implements FR-6 of admin-violations-feedback
  it("accepts a message of exactly 2000 characters and refuses 2001", () => {
    expect(sendWarningSchema.safeParse({ caseId: CASE_ID, message: "а".repeat(WARNING_MESSAGE_MAX_LENGTH) }).success).toBe(
      true,
    );
    expect(
      sendWarningSchema.safeParse({ caseId: CASE_ID, message: "а".repeat(WARNING_MESSAGE_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });

  // implements FR-6 of admin-violations-feedback
  it("counts code points, not UTF-16 units, so 2000 emoji fit", () => {
    expect(sendWarningSchema.safeParse({ caseId: CASE_ID, message: "😀".repeat(WARNING_MESSAGE_MAX_LENGTH) }).success).toBe(
      true,
    );
  });

  // implements FR-6 of admin-violations-feedback
  it("does not count the spaces the trim drops", () => {
    const message = ` ${"а".repeat(WARNING_MESSAGE_MAX_LENGTH)} `;

    expect(sendWarningSchema.safeParse({ caseId: CASE_ID, message }).success).toBe(true);
  });

  // implements FR-15 of admin-violations-feedback
  it.each(["42", "", CASE_ID.toUpperCase()])("refuses the case id %j", (caseId) => {
    expect(sendWarningSchema.safeParse({ caseId, message: "ok" }).success).toBe(false);
  });
});

describe("the case action schemas", () => {
  // implements FR-1 of admin-violations-feedback
  it("accepts a user, a ground and the content that prompted the case", () => {
    expect(
      addViolationCaseSchema.safeParse({
        userId: TARGET_USER_ID,
        ground: "harmful-content",
        content: { kind: "poem", id: POEM_ID },
      }).success,
    ).toBe(true);
  });

  // implements FR-1 of admin-violations-feedback
  it("accepts a case with no content", () => {
    expect(addViolationCaseSchema.safeParse({ userId: TARGET_USER_ID, ground: "malicious-activity" }).success).toBe(true);
    expect(
      addViolationCaseForAuthorSchema.safeParse({ authorProfileId: AUTHOR_PROFILE_ID, ground: "malicious-activity" })
        .success,
    ).toBe(true);
  });

  // implements FR-1, FR-15 of admin-violations-feedback
  it.each([
    ["a ground outside the list", { userId: TARGET_USER_ID, ground: "spam" }],
    ["no ground", { userId: TARGET_USER_ID }],
    ["a non-uuid user", { userId: "not-an-id", ground: "harmful-content" }],
    ["content of another kind", { userId: TARGET_USER_ID, ground: "harmful-content", content: { kind: "comment", id: POEM_ID } }],
    ["content with a non-uuid id", { userId: TARGET_USER_ID, ground: "harmful-content", content: { kind: "poem", id: "x" } }],
  ])("refuses %s", (_case, input) => {
    expect(addViolationCaseSchema.safeParse(input).success).toBe(false);
  });

  // implements FR-1 of admin-violations-feedback
  it("takes a profile id in the author form and not a user id", () => {
    expect(addViolationCaseForAuthorSchema.safeParse({ userId: TARGET_USER_ID, ground: "harmful-content" }).success).toBe(
      false,
    );
  });

  // implements FR-7 of admin-violations-feedback
  it("validates the ground switch and the case id", () => {
    expect(setCaseGroundSchema.safeParse({ caseId: CASE_ID, ground: "malicious-activity" }).success).toBe(true);
    expect(setCaseGroundSchema.safeParse({ caseId: CASE_ID, ground: "other" }).success).toBe(false);
    expect(caseIdSchema.safeParse({ caseId: "42" }).success).toBe(false);
  });
});
