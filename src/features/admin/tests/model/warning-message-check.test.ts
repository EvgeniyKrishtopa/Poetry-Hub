import { describe, expect, it } from "vitest";

import { WARNING_MESSAGE_MAX_LENGTH } from "../../model/violation.constants";
import { checkWarningMessage } from "../../model/warning-message-check";

describe("checkWarningMessage", () => {
  // implements FR-6 of admin-violations-feedback
  it.each(["", "   ", "\n\t "])("refuses the empty message %j", (message) => {
    expect(checkWarningMessage(message)).toEqual({ ok: false, error: "empty" });
  });

  // implements FR-6 of admin-violations-feedback
  it("accepts a message of exactly the longest length and refuses one more", () => {
    expect(checkWarningMessage("а".repeat(WARNING_MESSAGE_MAX_LENGTH))).toEqual({ ok: true });
    expect(checkWarningMessage("а".repeat(WARNING_MESSAGE_MAX_LENGTH + 1))).toEqual({ ok: false, error: "too-long" });
  });

  // implements FR-6 of admin-violations-feedback
  it("counts code points after trimming, so spaces around the text and an emoji count once", () => {
    expect(checkWarningMessage(`  ${"😀".repeat(WARNING_MESSAGE_MAX_LENGTH)}  `)).toEqual({ ok: true });
  });
});
