import { render } from "@testing-library/react";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";
import { getAuthorPoem } from "@/features/poems";

import { Breadcrumbs } from "../../components/Breadcrumbs/Breadcrumbs";
import { BreadcrumbsLoader } from "../../components/BreadcrumbsLoader/BreadcrumbsLoader";
import { BreadcrumbsPlaceholder } from "../../components/BreadcrumbsPlaceholder/BreadcrumbsPlaceholder";
import { BreadcrumbsView } from "../../components/BreadcrumbsView/BreadcrumbsView";

vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
}));

vi.mock("@/features/poems", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/poems")>()),
  getAuthorPoem: vi.fn(),
}));

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

afterEach(() => {
  vi.clearAllMocks();
});

describe("BreadcrumbsPlaceholder", () => {
  // implements NFR-4 of add-breadcrumbs
  it("holds one row of the trail's height, hidden from assistive technology", () => {
    const { container } = render(<BreadcrumbsPlaceholder />);

    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveClass("pt-4");
    expect(root?.querySelector(".h-5")).not.toBeNull();
  });
});

describe("Breadcrumbs", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements NFR-4 of add-breadcrumbs
  it("streams the loader inside Suspense, with the placeholder as the fallback", () => {
    const segments = Promise.resolve(["authors"]);
    const element = Breadcrumbs({ segments });

    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as {
      fallback: ReactElement;
      children: ReactElement<{ segments: unknown }>;
    };
    expect(fallback.type).toBe(BreadcrumbsPlaceholder);
    expect(children.type).toBe(BreadcrumbsLoader);
    expect(children.props.segments).toBe(segments);
  });
});

describe("BreadcrumbsLoader", () => {
  async function load(segments: readonly string[]): Promise<ReactNode> {
    return BreadcrumbsLoader({ segments: Promise.resolve(segments) });
  }

  // implements FR-1, FR-2 of add-breadcrumbs
  it("renders the view for a static page without reading any author", async () => {
    const element = (await load(["login"])) as ReactElement<{ items: unknown }>;

    expect(element.type).toBe(BreadcrumbsView);
    expect(element.props.items).toEqual([
      { kind: "link", label: "Главная", href: "/" },
      { kind: "current", label: "Вход" },
    ]);
    expect(getPublicAuthorName).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-breadcrumbs
  it("reads the author's name for an author page", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });

    const element = (await load(["authors", ANNA_ID])) as ReactElement<{ items: { label: string }[] }>;

    expect(getPublicAuthorName).toHaveBeenCalledWith(ANNA_ID);
    expect(element.props.items.map((item) => item.label)).toEqual(["Главная", "Наши авторы", "Анна Ахматова"]);
  });

  // implements FR-8 of add-author-poems
  it("reads the author's name but not any poem for the poem list", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });

    const element = (await load(["authors", ANNA_ID, "poems"])) as ReactElement<{ items: { label: string }[] }>;

    expect(getPublicAuthorName).toHaveBeenCalledWith(ANNA_ID);
    expect(getAuthorPoem).not.toHaveBeenCalled();
    expect(element.props.items.map((item) => item.label)).toEqual([
      "Главная",
      "Наши авторы",
      "Анна Ахматова",
      "Произведения",
    ]);
  });

  // implements FR-8, FR-12 of add-author-poems
  it("reads the author's name and the poem for a poem page", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });
    vi.mocked(getAuthorPoem).mockResolvedValue({
      ok: true,
      poem: {
        id: "osenniy-sad",
        title: "Осенний сад",
        text: "Строка",
        illustrationSrc: "/mock-poems/osenniy-sad.svg",
        publishedAt: "2026-03-12",
        genre: "Лирика",
      },
    });

    const element = (await load(["authors", ANNA_ID, "poems", "osenniy-sad"])) as ReactElement<{
      items: { label: string }[];
    }>;

    expect(getPublicAuthorName).toHaveBeenCalledTimes(1);
    expect(getPublicAuthorName).toHaveBeenCalledWith(ANNA_ID);
    expect(getAuthorPoem).toHaveBeenCalledTimes(1);
    expect(getAuthorPoem).toHaveBeenCalledWith(ANNA_ID, "osenniy-sad");
    expect(element.props.items.map((item) => item.label)).toEqual([
      "Главная",
      "Наши авторы",
      "Анна Ахматова",
      "Произведения",
      "Осенний сад",
    ]);
  });

  // implements FR-8 of add-author-poems
  it("reads no poem on an author page", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });

    await load(["authors", ANNA_ID]);

    expect(getAuthorPoem).not.toHaveBeenCalled();
  });

  // implements FR-4, FR-6 of add-breadcrumbs
  it("renders nothing for an unknown author or an unknown URL", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(load(["authors", ANNA_ID])).resolves.toBeNull();
    await expect(load(["no-such-page"])).resolves.toBeNull();
  });
});
