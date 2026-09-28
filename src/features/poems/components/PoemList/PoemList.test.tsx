import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { usePoemsUiStore } from "../../model/poems-ui.store";
import { PoemList } from "./PoemList";

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PoemList />
    </QueryClientProvider>,
  );
}

describe("PoemList", () => {
  beforeEach(() => {
    usePoemsUiStore.getState().resetSearch();
  });

  it("shows a loading state, then the fetched poems", async () => {
    renderWithQueryClient();

    expect(screen.getByText("Loading poems…")).toBeInTheDocument();
    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Ozymandias" })).toBeInTheDocument();
  });

  it("shows only poems matching the search query", async () => {
    renderWithQueryClient();
    await screen.findAllByRole("article");

    act(() => usePoemsUiStore.getState().setSearchQuery("frost"));

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "The Road Not Taken" })).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    renderWithQueryClient();
    await screen.findAllByRole("article");

    act(() => usePoemsUiStore.getState().setSearchQuery("no such poem"));

    expect(screen.getByText("No poems match your search.")).toBeInTheDocument();
  });
});
