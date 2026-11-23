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

  // implements NFR-4 of home-page-sections: the lg size and the onImage variant
  it("draws the lg size as 16/24 text with px-5 py-3 padding", () => {
    render(<Button size="lg">Read</Button>);

    expect(screen.getByRole("button", { name: "Read" })).toHaveClass("button", "primary", "lg");

    const css = readFileSync(BUTTON_CSS_PATH, "utf8");
    const largeRules = css.match(/\.lg\s*{([^}]*)}/)?.[1] ?? "";
    expect(largeRules).toContain("padding: 0.75rem 1.25rem");
    expect(largeRules).toContain("font-size: 1rem");
    expect(largeRules).toContain("line-height: 1.5rem");
  });

  // implements NFR-4 of home-page-sections: no leftover size class on the default button
  it("adds no size class to the default size", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).className).not.toContain("lg");
  });

  // implements NFR-4 of home-page-sections: a white outline from tokens only
  it("styles the onImage variant as a transparent fill with an on-hero outline from tokens only", () => {
    render(<Button variant="onImage">Join</Button>);

    expect(screen.getByRole("button", { name: "Join" })).toHaveClass("button", "onImage");

    const css = readFileSync(BUTTON_CSS_PATH, "utf8");
    const onImageRules = [...css.matchAll(/\.onImage(?::hover)?\s*{([^}]*)}/g)].map((m) => m[1]).join("\n");
    expect(onImageRules).toContain("transparent");
    expect(onImageRules).toContain("var(--color-on-hero)");
    expect(onImageRules).not.toMatch(COLOUR_LITERAL);
  });
});
