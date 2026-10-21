import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutPlaceholder } from "../../components/AboutPlaceholder/AboutPlaceholder";
import { ABOUT_LOADING_LABEL } from "../../model/about-messages";

describe("AboutPlaceholder", () => {
  it("announces loading through a status region", () => {
    render(<AboutPlaceholder />);

    expect(screen.getByRole("status")).toHaveTextContent(ABOUT_LOADING_LABEL);
  });

  it("hides every skeleton block from assistive technology", () => {
    const { container } = render(<AboutPlaceholder />);

    const blocks = container.querySelectorAll("[data-skeleton]");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
