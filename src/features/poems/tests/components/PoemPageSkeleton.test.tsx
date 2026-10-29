import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PoemPageSkeleton } from "../../components/PoemPageSkeleton/PoemPageSkeleton";

describe("PoemPageSkeleton", () => {
  // implements FR-13 of add-poem-creation
  it("shows illustration, heading, and three text-line blocks hidden from screen readers, and announces loading", () => {
    const { container } = render(<PoemPageSkeleton />);

    const skeletons = [...container.querySelectorAll("[data-skeleton]")];
    expect(skeletons).toHaveLength(5);
    expect(skeletons[0]).toHaveClass("aspect-video");
    for (const skeleton of skeletons) {
      expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(skeleton).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
  });
});
