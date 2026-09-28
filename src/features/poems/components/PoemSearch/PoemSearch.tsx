"use client";

import { Button } from "@/shared/ui";

import { usePoemsUiStore } from "../../model/poems-ui.store";

export function PoemSearch() {
  const searchQuery = usePoemsUiStore((state) => state.searchQuery);
  const setSearchQuery = usePoemsUiStore((state) => state.setSearchQuery);
  const resetSearch = usePoemsUiStore((state) => state.resetSearch);

  return (
    <div className="flex items-center gap-2">
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search by title or author"
        aria-label="Search poems"
        className="flex-1 rounded-full border border-border bg-background px-4 py-2 outline-none focus:border-accent"
      />
      <Button variant="ghost" onClick={resetSearch} disabled={!searchQuery}>
        Clear
      </Button>
    </div>
  );
}
