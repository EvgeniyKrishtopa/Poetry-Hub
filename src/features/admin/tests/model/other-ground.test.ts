import { describe, expect, it } from "vitest";

import { otherGround } from "../../model/other-ground";

describe("otherGround", () => {
  // implements FR-7 of admin-violations-feedback
  it("flips each ground to the other, and flipping twice comes back", () => {
    expect(otherGround("harmful-content")).toBe("malicious-activity");
    expect(otherGround("malicious-activity")).toBe("harmful-content");
    expect(otherGround(otherGround("harmful-content"))).toBe("harmful-content");
  });
});
