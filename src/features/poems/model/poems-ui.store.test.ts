import { beforeEach, describe, expect, it } from "vitest";

import { usePoemsUiStore } from "./poems-ui.store";

describe("usePoemsUiStore", () => {
  beforeEach(() => {
    usePoemsUiStore.getState().resetSearch();
  });

  it("starts with an empty search query", () => {
    expect(usePoemsUiStore.getState().searchQuery).toBe("");
  });

  it("sets and resets the search query", () => {
    usePoemsUiStore.getState().setSearchQuery("frost");
    expect(usePoemsUiStore.getState().searchQuery).toBe("frost");

    usePoemsUiStore.getState().resetSearch();
    expect(usePoemsUiStore.getState().searchQuery).toBe("");
  });
});
