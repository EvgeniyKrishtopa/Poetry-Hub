import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../Button/Button";

// jsdom applies no CSS Modules styles, so the variant's rules are read from the stylesheet itself. Built
// with `join`, not `new URL("….css", import.meta.url)`, which Vite rewrites into a served asset URL.
const BUTTON_CSS_PATH = join(dirname(fileURLToPath(import.meta.url)), "../Button/Button.module.css");
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;

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

  // implements NFR-6 of delete-poem: the danger fill and its text come from tokens
  it("styles the danger variant from the danger and on-danger tokens only", () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("button", "danger");

    const css = readFileSync(BUTTON_CSS_PATH, "utf8");
    const dangerRules = [...css.matchAll(/\.danger(?::hover)?\s*{([^}]*)}/g)].map((m) => m[1]).join("\n");
    expect(dangerRules).toContain("var(--color-danger)");
    expect(dangerRules).toContain("var(--color-on-danger)");
    expect(dangerRules).not.toMatch(COLOUR_LITERAL);
  });
});
