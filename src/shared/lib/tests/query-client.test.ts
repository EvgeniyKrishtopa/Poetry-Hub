import { describe, expect, it } from "vitest";

import { getQueryClient } from "../query-client";

describe("getQueryClient (browser)", () => {
  it("returns the same client on every call", () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it("sets a non-zero staleTime so hydrated data is not refetched immediately", () => {
    expect(getQueryClient().getDefaultOptions().queries?.staleTime).toBe(60_000);
  });
});
