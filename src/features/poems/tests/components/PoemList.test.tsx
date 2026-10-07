import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPoems } from "../../api/poems.api";

import { usePoemsUiStore } from "../../model/poems-ui.store";
import { PoemList } from "../../components/PoemList/PoemList";

// The real mock data by default; one test forces the fetch to fail.
vi.mock("../../api/poems.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/poems.api")>();
  return { ...actual, fetchPoems: vi.fn(actual.fetchPoems) };
});

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

  // implements FR-4 of add-feedback-color-tokens
  it("shows the load error inside the danger alert", async () => {
    vi.mocked(fetchPoems).mockRejectedValueOnce(new Error("source down"));
    renderWithQueryClient();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load poems.");
    expect(alert).toHaveClass("border-danger", "border-l-4");
  });
});
