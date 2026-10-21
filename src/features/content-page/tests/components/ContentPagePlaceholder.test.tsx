import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContentPagePlaceholder } from "../../components/ContentPagePlaceholder/ContentPagePlaceholder";
import { CONTENT_PAGE_LOADING_LABEL } from "../../model/content-page-messages";

describe("ContentPagePlaceholder", () => {
  it("announces loading through a status region", () => {
    render(<ContentPagePlaceholder />);

    expect(screen.getByRole("status")).toHaveTextContent(CONTENT_PAGE_LOADING_LABEL);
  });

  it("hides every skeleton block from assistive technology", () => {
    const { container } = render(<ContentPagePlaceholder />);

    const blocks = container.querySelectorAll("[data-skeleton]");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
