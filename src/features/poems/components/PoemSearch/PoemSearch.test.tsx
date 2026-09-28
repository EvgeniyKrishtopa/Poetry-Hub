import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { usePoemsUiStore } from "../../model/poems-ui.store";
import { PoemSearch } from "./PoemSearch";

describe("PoemSearch", () => {
  beforeEach(() => {
    usePoemsUiStore.getState().resetSearch();
  });

  it("writes typed text to the store and clears it", async () => {
    const user = userEvent.setup();
    render(<PoemSearch />);

    const clearButton = screen.getByRole("button", { name: "Clear" });
    expect(clearButton).toBeDisabled();

    await user.type(screen.getByRole("searchbox", { name: "Search poems" }), "frost");
    expect(usePoemsUiStore.getState().searchQuery).toBe("frost");
    expect(clearButton).toBeEnabled();

    await user.click(clearButton);
    expect(usePoemsUiStore.getState().searchQuery).toBe("");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});
