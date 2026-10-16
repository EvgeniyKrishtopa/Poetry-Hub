import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ButtonLink } from "../ButtonLink/ButtonLink";

describe("ButtonLink", () => {
  it("renders a primary-styled link, not a button", () => {
    render(<ButtonLink href="/account/author">Edit</ButtonLink>);
    const link = screen.getByRole("link", { name: "Edit" });

    expect(link).toHaveAttribute("href", "/account/author");
    expect(link).toHaveClass("button", "primary");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("applies the variant and merges a custom className", () => {
    render(
      <ButtonLink href="/authors" variant="ghost" className="w-full">
        Open
      </ButtonLink>,
    );

    expect(screen.getByRole("link", { name: "Open" })).toHaveClass("button", "ghost", "w-full");
  });
});
