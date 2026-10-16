import { render, screen } from "@testing-library/react";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HeaderSession } from "@/features/auth";
import { AuthorsNavLink } from "@/features/authors";

import RootLayout from "../layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));
vi.mock("@/features/auth", () => ({ HeaderSession: () => null }));
vi.mock("@/features/authors", async () => {
  const actual = await vi.importActual<typeof import("../../features/authors/components/AuthorsNavLink/AuthorsNavLink")>(
    "../../features/authors/components/AuthorsNavLink/AuthorsNavLink",
  );
  return { AuthorsNavLink: actual.AuthorsNavLink };
});

type AnyElement = ReactElement<{ children?: ReactNode }>;

/** Depth-first search of an element tree that has not been rendered (the layout returns `<html>`). */
function findElement(node: ReactNode, type: unknown): AnyElement | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    const element = child as AnyElement;
    if (element.type === type) return element;
    const found = findElement(element.props.children, type);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe("RootLayout header", () => {
  // implements FR-3 of add-author-profiles
  it("puts «Наши авторы» before the session part in a nav, outside the session's Suspense", () => {
    const tree = RootLayout({ children: null, params: Promise.resolve({}) });

    const nav = findElement(tree, "nav");
    expect(nav).toBeDefined();
    const items = Children.toArray(nav?.props.children) as AnyElement[];
    expect(items.map((item) => item.type)).toEqual([AuthorsNavLink, HeaderSession]);
  });

  // implements FR-3, NFR-8 of add-author-profiles
  it("links «Наши авторы» to /authors with lang=ru", () => {
    render(<AuthorsNavLink />);

    const link = screen.getByRole("link", { name: "Наши авторы" });
    expect(link).toHaveAttribute("href", "/authors");
    expect(link).toHaveAttribute("lang", "ru");
  });
});
