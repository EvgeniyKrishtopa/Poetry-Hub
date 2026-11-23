import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeSection } from "../../components/HomeSection/HomeSection";

function renderSection(props: Partial<Parameters<typeof HomeSection>[0]> = {}) {
  render(
    <HomeSection {...props}>
      <p>Content</p>
    </HomeSection>,
  );
  const section = screen.getByText("Content").closest("section");
  const column = screen.getByText("Content").parentElement;
  return { section, column };
}

describe("HomeSection", () => {
  // implements NFR-4 of home-page-sections
  it("sits on the page background in the wide column by default", () => {
    const { section, column } = renderSection();

    expect(section).not.toHaveClass("bg-surface");
    expect(section).not.toHaveClass("border-t");
    expect(section).toHaveClass("py-(--section-y)");
    expect(column).toHaveClass("max-w-measure-wide");
  });

  // implements NFR-4 of home-page-sections
  it("draws the surface tone as a tinted band with a top line, so two in a row stay apart", () => {
    const { section } = renderSection({ tone: "surface" });

    expect(section).toHaveClass("bg-surface", "border-t", "border-border");
  });

  // implements NFR-4 of home-page-sections
  it("puts the content in the reading column for the text width", () => {
    const { column } = renderSection({ width: "text" });

    expect(column).toHaveClass("max-w-measure-text");
    expect(column).not.toHaveClass("max-w-measure-wide");
  });
});
