import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeJoinCta } from "../../components/HomeJoinCta/HomeJoinCta";
import { JOIN_COPY } from "../../model/home-messages";

describe("HomeJoinCta", () => {
  // implements FR-6 of home-page-sections
  it("shows its heading and text, and its button leads to /signup", () => {
    render(<HomeJoinCta />);

    expect(screen.getByRole("heading", { level: 2, name: JOIN_COPY.heading })).toBeInTheDocument();
    expect(screen.getByText(JOIN_COPY.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: JOIN_COPY.button })).toHaveAttribute("href", "/signup");
  });
});
