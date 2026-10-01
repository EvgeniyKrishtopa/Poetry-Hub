import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "../not-found";

// implements FR-1 of add-route-states
describe("NotFound", () => {
  it("shows the not-found heading", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });

  it("links back to the home page", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Back to the home page" })).toHaveAttribute("href", "/");
  });
});
