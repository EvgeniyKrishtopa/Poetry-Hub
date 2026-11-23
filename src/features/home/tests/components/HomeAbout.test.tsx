import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeAbout } from "../../components/HomeAbout/HomeAbout";
import { ABOUT_COPY } from "../../model/home-messages";

describe("HomeAbout", () => {
  // implements FR-3 of home-page-sections
  it("shows its heading and text, and its link leads to /about", () => {
    render(<HomeAbout />);

    expect(screen.getByRole("heading", { level: 2, name: ABOUT_COPY.heading })).toBeInTheDocument();
    expect(screen.getByText(ABOUT_COPY.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ABOUT_COPY.link })).toHaveAttribute("href", "/about");
  });
});
