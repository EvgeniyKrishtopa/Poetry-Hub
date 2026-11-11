import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { PublicCollectionContent } from "../../components/PublicCollectionContent/PublicCollectionContent";
import { PublicCollectionPage } from "../../components/PublicCollectionPage/PublicCollectionPage";
import { PublicCollectionSkeleton } from "../../components/PublicCollectionSkeleton/PublicCollectionSkeleton";

// The content is an async Server Component that reads the database; this file only inspects the tree around it.
vi.mock("../../dal/public-collections", () => ({ getPublicCollection: vi.fn() }));

describe("PublicCollectionPage", () => {
  // implements FR-5 of public-collections
  it("streams the content inside Suspense, with the collection skeleton as its fallback", () => {
    const authorId = Promise.resolve("author");
    const collectionId = Promise.resolve("collection");
    const element = PublicCollectionPage({ authorId, collectionId });

    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as {
      fallback: ReactElement;
      children: ReactElement<{ authorId: unknown; collectionId: unknown }>;
    };
    expect(children.type).toBe(PublicCollectionContent);
    expect(children.props).toEqual({ authorId, collectionId });
    expect(fallback.type).toBe(PublicCollectionSkeleton);
  });
});

describe("PublicCollectionSkeleton", () => {
  // implements FR-5, NFR-6 of public-collections
  it("shows a heading bar, two description bars, and three link bars hidden from screen readers, and announces loading", () => {
    const { container } = render(<PublicCollectionSkeleton />);

    const skeletons = [...container.querySelectorAll("[data-skeleton]")];
    expect(skeletons).toHaveLength(6);
    const heights = skeletons.map((bar) => ["h-10", "h-5", "h-6"].find((height) => bar.classList.contains(height)));
    expect(heights).toEqual(["h-10", "h-5", "h-5", "h-6", "h-6", "h-6"]);
    for (const skeleton of skeletons) {
      expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(skeleton).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
  });
});
