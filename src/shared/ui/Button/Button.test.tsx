import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("defaults to a primary, non-submitting button", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("button", "primary");
  });

  it("applies the variant and merges a custom className", () => {
    render(
      <Button variant="ghost" className="w-full">
        Cancel
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("ghost", "w-full");
  });
});
