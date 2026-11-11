import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import AuthorRoutePage from "../(public)/authors/[id]/page";

// The feature components are stand-ins: this test only pins what the route composes and in which order.
vi.mock("@/features/authors", () => ({
  AuthorPage: ({ poems }: { poems: ReactNode }) => <div data-testid="author-page">{poems}</div>,
}));
vi.mock("@/features/collections", () => ({
  PublicCollectionsSection: () => <section>collections section</section>,
}));
vi.mock("@/features/poems", () => ({
  AuthorPoemsEntry: () => <section>poems section</section>,
}));

describe("author route page", () => {
  // implements FR-2, FR-3 of public-collections
  it("puts the collections section before the poems section inside the author page's slot", () => {
    render(<AuthorRoutePage {...({ params: Promise.resolve({ id: "author-id" }) } as PageProps<"/authors/[id]">)} />);

    const slot = screen.getByTestId("author-page");
    expect(Array.from(slot.children).map((child) => child.textContent)).toEqual([
      "collections section",
      "poems section",
    ]);
  });
});
