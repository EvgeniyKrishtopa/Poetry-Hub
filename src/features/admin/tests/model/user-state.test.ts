import { describe, expect, it } from "vitest";

import { availableActions, userStateOf } from "../../model/user-state";

describe("userStateOf", () => {
  // implements FR-3 of admin-moderation
  it("derives the state from the flag and the restriction, an admin outranking any restriction", () => {
    expect(userStateOf({ isAdmin: false, restriction: null })).toBe("active");
    expect(userStateOf({ isAdmin: false, restriction: "blocked" })).toBe("blocked");
    expect(userStateOf({ isAdmin: false, restriction: "banned" })).toBe("banned");
    expect(userStateOf({ isAdmin: true, restriction: "blocked" })).toBe("admin");
  });
});

describe("availableActions", () => {
  // implements FR-3, FR-4 of admin-moderation
  it("offers block, revoke and ban to an active user, and unblock instead of block to a blocked one", () => {
    expect(availableActions("active")).toEqual(["block", "revoke", "ban"]);
    expect(availableActions("blocked")).toEqual(["unblock", "revoke", "ban"]);
  });

  // implements FR-3, FR-4 of admin-moderation
  it("offers a banned user only revoke (no unblock) and an admin nothing", () => {
    expect(availableActions("banned")).toEqual(["revoke"]);
    expect(availableActions("admin")).toEqual([]);
  });
});
