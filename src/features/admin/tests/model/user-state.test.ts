import { describe, expect, it } from "vitest";

import { availableActions, userStateOf } from "../../model/user-state";

describe("userStateOf", () => {
  // implements FR-3 of admin-moderation
  it("derives the state from the restriction, active when there is none (admins are never listed)", () => {
    expect(userStateOf({ restriction: null })).toBe("active");
    expect(userStateOf({ restriction: "blocked" })).toBe("blocked");
    expect(userStateOf({ restriction: "banned" })).toBe("banned");
  });
});

describe("availableActions", () => {
  // implements FR-3, FR-4 of admin-moderation
  it("offers block, revoke and ban to an active user, and unblock instead of block to a blocked one", () => {
    expect(availableActions("active")).toEqual(["block", "revoke", "ban"]);
    expect(availableActions("blocked")).toEqual(["unblock", "revoke", "ban"]);
  });

  // implements FR-3, FR-4 of admin-moderation
  it("offers a banned user only revoke (no unblock)", () => {
    expect(availableActions("banned")).toEqual(["revoke"]);
  });
});
