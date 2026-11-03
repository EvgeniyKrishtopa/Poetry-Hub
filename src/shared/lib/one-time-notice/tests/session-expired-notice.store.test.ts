import { afterEach, describe, expect, it } from "vitest";

import { useSessionExpiredNotice } from "../session-expired-notice.store";

afterEach(() => {
  useSessionExpiredNotice.getState().clearSessionExpired();
});

describe("useSessionExpiredNotice", () => {
  it("starts unset", () => {
    expect(useSessionExpiredNotice.getState().expired).toBe(false);
  });

  // implements FR-6 of delete-poem
  it("is set by a mark and unset by a clear", () => {
    useSessionExpiredNotice.getState().markSessionExpired();
    expect(useSessionExpiredNotice.getState().expired).toBe(true);

    useSessionExpiredNotice.getState().clearSessionExpired();
    expect(useSessionExpiredNotice.getState().expired).toBe(false);
  });
});
