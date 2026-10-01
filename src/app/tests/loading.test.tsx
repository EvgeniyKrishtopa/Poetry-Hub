import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "../loading";

/** One heading bar plus three text bars. */
const EXPECTED_SKELETON_BLOCKS = 4;

function renderSkeletonBlocks(): HTMLElement[] {
  const { container } = render(<Loading />);
  const blocks = Array.from(container.querySelectorAll<HTMLElement>("[data-skeleton]"));
  expect(blocks).toHaveLength(EXPECTED_SKELETON_BLOCKS);
  return blocks;
}

// implements FR-6 of add-route-states
describe("Loading", () => {
  it("announces a status region with accessible text", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("hides every skeleton block from assistive technology", () => {
    for (const block of renderSkeletonBlocks()) expect(block).toHaveAttribute("aria-hidden", "true");
  });

  // implements NFR-2 of add-route-states
  it("disables the pulse animation for reduced motion", () => {
    for (const block of renderSkeletonBlocks()) {
      expect(block).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
  });
});
