"use client";

import { Alert } from "@/shared/ui";

import { usePoemsQuery } from "../../api/poems.queries";
import { filterPoems } from "../../model/filter-poems";
import { usePoemsUiStore } from "../../model/poems-ui.store";
import { PoemCard } from "../PoemCard/PoemCard";

export function PoemList() {
  const { data: poems, isPending, isError } = usePoemsQuery();
  const searchQuery = usePoemsUiStore((state) => state.searchQuery);

  if (isPending) return <p className="text-muted">Loading poems…</p>;
  // implements FR-4 of add-feedback-color-tokens
  if (isError) return <Alert tone="danger">Could not load poems.</Alert>;

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
