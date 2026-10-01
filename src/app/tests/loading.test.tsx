import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "../loading";

function renderSkeletonBlocks(): HTMLElement[] {
  const { container } = render(<Loading />);
  return Array.from(container.querySelectorAll<HTMLElement>("[data-skeleton]"));
}

// implements FR-6 of add-route-states
describe("Loading", () => {
  it("announces a status region with accessible text", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("hides every skeleton block from assistive technology", () => {
    const blocks = renderSkeletonBlocks();

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(block).toHaveAttribute("aria-hidden", "true");
  });

  // implements NFR-2 of add-route-states
  it("disables the pulse animation for reduced motion", () => {
    for (const block of renderSkeletonBlocks()) {
      expect(block).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
  });
});
