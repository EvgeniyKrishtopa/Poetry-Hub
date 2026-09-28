import type { Poem } from "../model/poem.types";

// Placeholder data source. Replace with a real backend call (fetch / GraphQL / Supabase)
// without changing the function signature, so queries and UI stay untouched.
const MOCK_POEMS: readonly Poem[] = [
  {
    id: "the-road-not-taken",
    title: "The Road Not Taken",
    author: "Robert Frost",
    lines: [
      "Two roads diverged in a yellow wood,",
      "And sorry I could not travel both",
      "And be one traveler, long I stood",
    ],
  },
  {
    id: "hope-is-the-thing-with-feathers",
    title: "“Hope” is the thing with feathers",
    author: "Emily Dickinson",
    lines: [
      "“Hope” is the thing with feathers -",
      "That perches in the soul -",
      "And sings the tune without the words -",
    ],
  },
  {
    id: "ozymandias",
    title: "Ozymandias",
    author: "Percy Bysshe Shelley",
    lines: [
      "I met a traveller from an antique land,",
      "Who said—“Two vast and trunkless legs of stone",
      "Stand in the desert. . . .",
    ],
  },
];

export async function fetchPoems(): Promise<readonly Poem[]> {
  return MOCK_POEMS;
}
