import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFeaturedAuthors, getFeaturedWorks, getHomeGreeting, getLatestWorks } from "@/features/home";

import HomePage from "../(public)/page";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// The real authors index pulls in the whole feature; the hero needs only the path of the authors list.
vi.mock("@/features/authors", () => ({ AUTHORS_PATH: "/authors" }));
vi.mock("@/features/home", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/home")>()),
  getHomeGreeting: vi.fn(),
  getFeaturedWorks: vi.fn(),
  getFeaturedAuthors: vi.fn(),
  getLatestWorks: vi.fn(),
}));

const PAGE_PATH = join(process.cwd(), "src/app/(public)/page.tsx");

const FEATURED_HEADING = "Избранные произведения";
const ABOUT_HEADING = "О проекте";
const AUTHORS_HEADING = "Авторы проекта";
const LATEST_HEADING = "Последние публикации";
const JOIN_HEADING = "Станьте частью Поэтического Хаба";

const FEATURED_WORKS = [
  { id: "p1", title: "Осень", authorName: "Анна Ахматова", href: "/authors/a1/poems/p1", coverUrl: null },
  { id: "p2", title: "Зима", authorName: "Борис Пастернак", href: "/authors/a2/poems/p2", coverUrl: null },
];
const FEATURED_AUTHORS = [
  { id: "a1", name: "Анна Ахматова", href: "/authors/a1", photoUrl: null, description: "Поэт." },
];
const LATEST_WORKS = [
  { id: "p3", title: "Весна", authorName: "Анна Ахматова", href: "/authors/a1/poems/p3" },
];

function allSectionsUp() {
  vi.mocked(getHomeGreeting).mockResolvedValue({
    ok: true,
    greeting: { key: "home", title: "Welcome to Poetry Hub", message: "Hello, reader." },
  });
  vi.mocked(getFeaturedWorks).mockResolvedValue({ ok: true, items: FEATURED_WORKS });
  vi.mocked(getFeaturedAuthors).mockResolvedValue({ ok: true, items: FEATURED_AUTHORS });
  vi.mocked(getLatestWorks).mockResolvedValue({ ok: true, items: LATEST_WORKS });
}

async function renderPage() {
  const page = await HomePage();
  render(page);
  return screen.getByRole("main");
}

describe("home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allSectionsUp();
  });

  // implements FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 of home-page-sections
  it("renders the six sections in order: hero, featured, about, authors, latest, closing", async () => {
    const main = await renderPage();

    const headings = within(main).getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Welcome to Poetry Hub",
      FEATURED_HEADING,
      ABOUT_HEADING,
      AUTHORS_HEADING,
      LATEST_HEADING,
      JOIN_HEADING,
    ]);
  });

  // implements NFR-5 of home-page-sections
  it("has one h1 and every other heading an h2", async () => {
    const main = await renderPage();

    expect(within(main).getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(main).getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(within(main).getAllByRole("heading")).toHaveLength(6);
  });

  // implements home-greeting FR-6 of home-page-sections
  it("has no search box, no clear button and no poem list beyond the section lists", async () => {
    const main = await renderPage();

    expect(within(main).queryByRole("searchbox")).toBeNull();
    expect(within(main).queryByRole("button", { name: "Очистить" })).toBeNull();
  });

  // implements FR-7 of home-page-sections
  it("leaves one failed section out and renders the others", async () => {
    vi.mocked(getLatestWorks).mockResolvedValue({ ok: false });

    const main = await renderPage();

    expect(within(main).queryByRole("heading", { name: LATEST_HEADING })).toBeNull();
    expect(within(main).getByRole("heading", { name: FEATURED_HEADING })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: AUTHORS_HEADING })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: ABOUT_HEADING })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: JOIN_HEADING })).toBeInTheDocument();
  });

  // implements FR-7 of home-page-sections
  it("keeps the hero, about and closing sections when the three data sections fail together", async () => {
    vi.mocked(getFeaturedWorks).mockResolvedValue({ ok: false });
    vi.mocked(getFeaturedAuthors).mockResolvedValue({ ok: false });
    vi.mocked(getLatestWorks).mockResolvedValue({ ok: false });

    const main = await renderPage();

    expect(within(main).getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Welcome to Poetry Hub",
      ABOUT_HEADING,
      JOIN_HEADING,
    ]);
  });

  // implements FR-7, home-greeting FR-7 of home-page-sections
  it("renders the hero with the fallback and the page without an error screen when every read fails", async () => {
    vi.mocked(getHomeGreeting).mockResolvedValue({ ok: false, reason: "network" });
    vi.mocked(getFeaturedWorks).mockResolvedValue({ ok: false });
    vi.mocked(getFeaturedAuthors).mockResolvedValue({ ok: false });
    vi.mocked(getLatestWorks).mockResolvedValue({ ok: false });

    const main = await renderPage();

    expect(within(main).getByRole("heading", { level: 1, name: "Поэтический Хаб" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: ABOUT_HEADING })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: JOIN_HEADING })).toBeInTheDocument();
    expect(screen.queryByText("Что-то пошло не так")).toBeNull();
  });

  // implements NFR-1 of home-page-sections
  it("reads no cookies, headers or session inside its cache scope", () => {
    const source = readFileSync(PAGE_PATH, "utf8");

    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|getCurrentUserId|requireSession|getSession/);
    expect(source).toMatch(/["']use cache["']/);
  });
});
