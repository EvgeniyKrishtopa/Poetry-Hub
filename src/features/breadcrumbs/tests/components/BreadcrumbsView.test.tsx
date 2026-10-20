import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BreadcrumbsView } from "../../components/BreadcrumbsView/BreadcrumbsView";
import type { BreadcrumbItem } from "../../model/breadcrumb.types";

const ITEMS: readonly BreadcrumbItem[] = [
  { kind: "link", label: "Главная", href: "/" },
  { kind: "link", label: "Мастерская поэта", href: "/account" },
  { kind: "current", label: "Профиль автора" },
];

/** Hex, rgb()/hsl(), and arbitrary-value color classes such as `text-[#123]`. */
const HARD_CODED_COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\[#/i;

function renderTrail() {
  render(<BreadcrumbsView items={ITEMS} />);
  return screen.getByRole("navigation", { name: "Навигационная цепочка" });
}

describe("BreadcrumbsView", () => {
  // implements NFR-3, NFR-6 of add-breadcrumbs
  it("is a named landmark with one list item per label and no separator in the accessibility tree", () => {
    const nav = renderTrail();

    const items = within(nav).getAllByRole("listitem");
    expect(items.map((item) => item.textContent?.replace("›", ""))).toEqual([
      "Главная",
      "Мастерская поэта",
      "Профиль автора",
    ]);
    expect(within(nav).getByRole("list").tagName).toBe("OL");
    for (const separator of within(nav).getAllByText("›")) {
      expect(separator).toHaveAttribute("aria-hidden", "true");
    }
  });

  // implements FR-3 of add-breadcrumbs
  it("links the parent items in the regular text color and marks the current item in the accent color", () => {
    const nav = renderTrail();

    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Главная", "/"],
      ["Мастерская поэта", "/account"],
    ]);
    for (const link of links) {
      expect(link).toHaveClass("text-foreground");
      expect(link).not.toHaveClass("text-accent");
    }

    const current = within(nav).getByText("Профиль автора");
    expect(current.closest("a")).toBeNull();
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass("text-accent");
  });

  // implements NFR-2 of add-breadcrumbs
  it("takes every color from a design token, with no hard-coded value", () => {
    const nav = renderTrail();

    for (const element of [nav, ...nav.querySelectorAll("*")]) {
      expect(element.getAttribute("class") ?? "").not.toMatch(HARD_CODED_COLOR);
      expect(element.getAttribute("style") ?? "").not.toMatch(/color/i);
    }
  });
});
