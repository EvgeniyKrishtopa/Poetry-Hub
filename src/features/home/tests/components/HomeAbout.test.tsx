import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeAbout } from "../../components/HomeAbout/HomeAbout";
import { ABOUT_COPY } from "../../model/home-messages";

const CMS_COPY = { heading: "About from the CMS", text: "Text from the CMS." };

describe("HomeAbout", () => {
  // implements FR-3 of home-contentful-content
  it("shows the CMS heading and text, and its link leads to /about", () => {
    render(<HomeAbout copy={CMS_COPY} />);

    expect(screen.getByRole("heading", { level: 2, name: CMS_COPY.heading })).toBeInTheDocument();
    expect(screen.getByText(CMS_COPY.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ABOUT_COPY.link })).toHaveAttribute("href", "/about");
  });

  // implements FR-3 of home-contentful-content
  it("shows the static copy when it is given the fallback", () => {
    render(<HomeAbout copy={ABOUT_COPY} />);

    expect(screen.getByRole("heading", { level: 2, name: ABOUT_COPY.heading })).toBeInTheDocument();
    expect(screen.getByText(ABOUT_COPY.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ABOUT_COPY.link })).toHaveAttribute("href", "/about");
  });

  // implements FR-8 of home-contentful-content
  it("splits blank-line-separated blocks into paragraphs and keeps single line breaks", () => {
    const { container } = render(<HomeAbout copy={{ heading: "H", text: "Line one\nLine two\n\nSecond paragraph" }} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Line one\nLine two");
    expect(paragraphs[1].textContent).toBe("Second paragraph");
  });

  // implements FR-8 of home-contentful-content
  it("renders Markdown and HTML literally", () => {
    const { container } = render(<HomeAbout copy={{ heading: "H", text: "**Bold** <b>tag</b>" }} />);

    expect(screen.getByText("**Bold** <b>tag</b>")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });
});
