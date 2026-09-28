"use client";

import { usePoemsQuery } from "../../api/poems.queries";
import { filterPoems } from "../../model/filter-poems";
import { usePoemsUiStore } from "../../model/poems-ui.store";
import { PoemCard } from "../PoemCard/PoemCard";

export function PoemList() {
  const { data: poems, isPending, isError } = usePoemsQuery();
  const searchQuery = usePoemsUiStore((state) => state.searchQuery);

  if (isPending) return <p className="text-muted">Loading poems…</p>;
  if (isError) return <p role="alert">Could not load poems.</p>;

  // Derived on render, not stored: server data + UI state -> visible list.
  const visiblePoems = filterPoems(poems, searchQuery);

  if (visiblePoems.length === 0) {
    return <p className="text-muted">No poems match your search.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {visiblePoems.map((poem) => (
        <li key={poem.id}>
          <PoemCard poem={poem} />
        </li>
      ))}
    </ul>
  );
}
