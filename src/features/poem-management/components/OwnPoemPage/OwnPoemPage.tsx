import type { OwnPoemPageProps } from "./OwnPoemPage.types";

/** `/account/poems/<poemId>`: the owner's poem in a Suspense boundary (FR-7). */
export function OwnPoemPage({ poemId }: OwnPoemPageProps) {
  void poemId;
  return null;
}
