import { render, screen } from "@testing-library/react";
import { Children, Suspense, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminNavLink } from "@/features/admin";
import { HeaderAuthLinks } from "@/features/auth";
import { AuthorsNavLink } from "@/features/authors";
import { SiteFooter } from "@/features/site-footer";
import { siteConfig } from "@/shared/config/site";
import { TITLE_TEMPLATE } from "@/shared/lib/seo";
import { SITE_URL_ENV } from "@/shared/lib/seo/seo.constants";

import RootLayout, { generateMetadata } from "../layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
  Literata: () => ({ variable: "font-serif" }),
}));
// The real authors index loads here (server-only is stubbed in Vitest); only auth's session part is
// replaced, since the authors loaders import their session accessors from it.
vi.mock("@/features/auth", () => ({
  HeaderAuthLinks: () => null,
  getCurrentUserId: vi.fn(),
  requireSession: vi.fn(),
}));

type AnyElement = ReactElement<{ children?: ReactNode }>;

/**
 * Depth-first search of an element tree that has not been rendered (the layout returns `<html>`).
 * Returns the path from the outermost element down to the first one of `type`, or `undefined`.
 */
function pathTo(node: ReactNode, type: unknown): AnyElement[] | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    const element = child as AnyElement;
    if (element.type === type) return [element];
    const rest = pathTo(element.props.children, type);
    if (rest !== undefined) return [element, ...rest];
  }
  return undefined;
}

function renderLayoutTree(): ReactNode {
  return RootLayout({ children: null, breadcrumbs: null, params: Promise.resolve({}) });
}

describe("RootLayout header", () => {
  // implements FR-3 of add-author-profiles
  it("puts «Наши авторы» before the session part in a nav", () => {
    const nav = pathTo(renderLayoutTree(), "nav")?.at(-1);
    expect(nav).toBeDefined();

    const items = Children.toArray(nav?.props.children) as AnyElement[];
    expect(items.map((item) => item.type)).toEqual([AuthorsNavLink, HeaderAuthLinks]);
  });

  // implements FR-20 of admin-moderation
  it("fills the session part's adminLink slot with AdminNavLink", () => {
    const sessionPart = pathTo(renderLayoutTree(), HeaderAuthLinks)?.at(-1);

    const props = sessionPart?.props as { adminLink?: ReactElement } | undefined;
    expect(props?.adminLink?.type).toBe(AdminNavLink);
  });

  // implements FR-3 of add-author-profiles
  it("keeps «Наши авторы» outside every Suspense boundary, so it shows while the session check is pending", () => {
    const path = pathTo(renderLayoutTree(), AuthorsNavLink);
    expect(path).toBeDefined();

    // Its ancestors: no Suspense, and not the session part (whose own boundary lives inside HeaderAuthLinks).
    const ancestors = path?.slice(0, -1) ?? [];
    expect(ancestors.some((element) => element.type === Suspense)).toBe(false);
    expect(ancestors.some((element) => element.type === HeaderAuthLinks)).toBe(false);
  });

  // implements FR-1 of add-breadcrumbs
  it("renders the breadcrumbs slot between the header and the page", () => {
    const breadcrumbs = <nav data-slot="breadcrumbs" />;
    const page = <main data-slot="page" />;
    const tree = RootLayout({ children: page, breadcrumbs, params: Promise.resolve({}) });

    const shell = pathTo(tree, "header")?.at(-2);
    expect(shell).toBeDefined();
    const siblings = Children.toArray(shell?.props.children) as ReactElement<{ "data-slot"?: string }>[];
    const order = siblings.map((element) => {
      if (element.type === "header") return "header";
      if (element.type === SiteFooter) return "footer";
      return element.props["data-slot"];
    });
    expect(order).toEqual(["header", "breadcrumbs", "page", "footer"]);
  });

  // implements FR-3, NFR-8 of add-author-profiles
  it("links «Наши авторы» to /authors with lang=ru", () => {
    render(<AuthorsNavLink />);

    const link = screen.getByRole("link", { name: "Наши авторы" });
    expect(link).toHaveAttribute("href", "/authors");
    expect(link).toHaveAttribute("lang", "ru");
  });
});

describe("RootLayout metadata", () => {
  const SITE_URL = "https://example.org";

  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-1, FR-11 of seo-metadata
  it("sets the metadata base from the site address", () => {
    const metadata = generateMetadata();

    expect(metadata.metadataBase).toEqual(new URL(SITE_URL));
  });

  // implements FR-1 of seo-metadata
  it("sets the site name as the default title and the template that appends it", () => {
    const metadata = generateMetadata();

    expect(metadata.title).toEqual({ default: siteConfig.name, template: TITLE_TEMPLATE });
  });

  // implements FR-6 of seo-metadata: a field on the root reaches every page, the signed-in ones included
  it("sets no description, Open Graph, Twitter or robots field for the pages to inherit", () => {
    const metadata = generateMetadata();

    expect(Object.keys(metadata).toSorted()).toEqual(["metadataBase", "title"]);
  });
});
