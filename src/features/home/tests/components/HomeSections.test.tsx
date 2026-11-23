import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { cacheTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONTENTFUL_CACHE_TAG } from "@/shared/lib/contentful";

import { getHomeBanner } from "../../dal/home-banner";
import { getGreetingByKey } from "../../dal/home-greeting";
import { getFeaturedAuthors, getFeaturedWorks, getLatestWorks } from "../../dal/home-sections";
import { HomeSections } from "../../components/HomeSections/HomeSections";
import { ABOUT_GREETING_KEY } from "../../model/home.constants";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// The real authors index pulls in the whole feature; the hero needs only the path of the authors list.
vi.mock("@/features/authors", () => ({ AUTHORS_PATH: "/authors" }));
vi.mock("../../dal/home-banner", () => ({ getHomeBanner: vi.fn() }));
vi.mock("../../dal/home-greeting", () => ({ getGreetingByKey: vi.fn() }));
vi.mock("../../dal/home-sections", () => ({
  getFeaturedWorks: vi.fn(),
  getFeaturedAuthors: vi.fn(),
  getLatestWorks: vi.fn(),
}));

const SECTIONS_PATH = join(process.cwd(), "src/features/home/components/HomeSections/HomeSections.tsx");

const FEATURED_HEADING = "Избранные произведения";
const ABOUT_HEADING = "О проекте";
const CMS_ABOUT_HEADING = "About from the CMS";
const CMS_ABOUT_TEXT = "About text from the CMS.";
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
const LATEST_WORKS = [{ id: "p3", title: "Весна", authorName: "Анна Ахматова", href: "/authors/a1/poems/p3" }];

function allSectionsUp() {
  vi.mocked(getHomeBanner).mockResolvedValue({
    ok: true,
    banner: {
      title: "Welcome to Poetry Hub",
      description: "Hello, reader.",
      bannerImage: "https://images.ctfassets.net/abc123space/asset/token/hero.jpg",
    },
  });
  vi.mocked(getGreetingByKey).mockResolvedValue({
    ok: true,
    greeting: { key: ABOUT_GREETING_KEY, title: CMS_ABOUT_HEADING, message: CMS_ABOUT_TEXT },
  });
  vi.mocked(getFeaturedWorks).mockResolvedValue({ ok: true, items: FEATURED_WORKS });
  vi.mocked(getFeaturedAuthors).mockResolvedValue({ ok: true, items: FEATURED_AUTHORS });
  vi.mocked(getLatestWorks).mockResolvedValue({ ok: true, items: LATEST_WORKS });
}

async function renderSections() {
  const sections = await HomeSections();
  const { container } = render(<main>{sections}</main>);
  return { main: screen.getByRole("main"), container };
}

const headingTexts = (main: HTMLElement) => within(main).getAllByRole("heading").map((heading) => heading.textContent);

describe("HomeSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allSectionsUp();
  });

  // implements FR-1, FR-2, FR-3, FR-4, FR-5 of home-page-sections
  it("renders the five shared sections in order: hero, featured, about, authors, latest", async () => {
    const { main } = await renderSections();

    expect(headingTexts(main)).toEqual([
      "Welcome to Poetry Hub",
      FEATURED_HEADING,
      CMS_ABOUT_HEADING,
      AUTHORS_HEADING,
      LATEST_HEADING,
    ]);
  });

  // implements FR-3 of home-sections: the about read asks for its own key and its copy reaches the section
  it("reads the about key and renders the CMS text in the about section", async () => {
    const { main } = await renderSections();

    expect(getGreetingByKey).toHaveBeenCalledWith(ABOUT_GREETING_KEY);
    expect(within(main).getByText(CMS_ABOUT_TEXT)).toBeInTheDocument();
  });

  // implements FR-B4 of home-contentful-content: the banner's photo reaches the hero
  it("draws the hero over the banner's photo", async () => {
    const { container } = await renderSections();

    const image = container.querySelector("section img");
    expect(decodeURIComponent(image?.getAttribute("src") ?? "")).toContain(
      "https://images.ctfassets.net/abc123space/asset/token/hero.jpg",
    );
  });

  // implements FR-3 of home-sections: any about failure gives the static copy
  it("shows the static about copy when the about read fails", async () => {
    vi.mocked(getGreetingByKey).mockResolvedValue({ ok: false, reason: "network" });

    const { main } = await renderSections();

    expect(within(main).getByRole("heading", { name: ABOUT_HEADING })).toBeInTheDocument();
  });

  // implements NFR-B1 of home-contentful-content
  it("tags its cache scope with the Contentful tag the publish webhook expires", async () => {
    await renderSections();

    expect(cacheTag).toHaveBeenCalledWith(CONTENTFUL_CACHE_TAG, expect.any(String));
  });

  // implements FR-6 of home-page-sections: the invitation is not part of the cached sections
  it("holds no closing invitation", async () => {
    const { main } = await renderSections();

    expect(within(main).queryByRole("heading", { name: JOIN_HEADING })).toBeNull();
  });

  // implements NFR-5 of home-page-sections
  it("has one h1 and every other heading an h2", async () => {
    const { main } = await renderSections();

    expect(within(main).getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(main).getAllByRole("heading", { level: 2 })).toHaveLength(4);
  });

  // implements home-greeting FR-6 of home-page-sections
  it("has no search box and no clear button", async () => {
    const { main } = await renderSections();

    expect(within(main).queryByRole("searchbox")).toBeNull();
    expect(within(main).queryByRole("button", { name: "Очистить" })).toBeNull();
  });

  // implements FR-7 of home-page-sections
  it("leaves one failed section out and renders the others", async () => {
    vi.mocked(getLatestWorks).mockResolvedValue({ ok: false });

    const { main } = await renderSections();

    expect(headingTexts(main)).toEqual(["Welcome to Poetry Hub", FEATURED_HEADING, CMS_ABOUT_HEADING, AUTHORS_HEADING]);
  });

  // implements FR-7 of home-page-sections
  it("keeps the hero and about sections when the three data sections fail together", async () => {
    vi.mocked(getFeaturedWorks).mockResolvedValue({ ok: false });
    vi.mocked(getFeaturedAuthors).mockResolvedValue({ ok: false });
    vi.mocked(getLatestWorks).mockResolvedValue({ ok: false });

    const { main } = await renderSections();

    expect(headingTexts(main)).toEqual(["Welcome to Poetry Hub", CMS_ABOUT_HEADING]);
  });

  // implements FR-7, home-greeting FR-7 of home-page-sections
  it("renders the hero with the fallback and no error screen when every read fails", async () => {
    vi.mocked(getHomeBanner).mockResolvedValue({ ok: false, reason: "network" });
    vi.mocked(getGreetingByKey).mockResolvedValue({ ok: false, reason: "network" });
    vi.mocked(getFeaturedWorks).mockResolvedValue({ ok: false });
    vi.mocked(getFeaturedAuthors).mockResolvedValue({ ok: false });
    vi.mocked(getLatestWorks).mockResolvedValue({ ok: false });

    const { main } = await renderSections();

    expect(within(main).getByRole("heading", { level: 1, name: "Поэтический Хаб" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: ABOUT_HEADING })).toBeInTheDocument();
    expect(screen.queryByText("Что-то пошло не так")).toBeNull();
  });

  // implements NFR-1 of home-page-sections
  // Only half of the check: a source search sees this file, not what a helper reads. The other half is
  // `npm run build`, which lists `/` as prerendered and fails if anything in the cache scope reads the request.
  it("reads no cookies, headers or session inside its cache scope", () => {
    const source = readFileSync(SECTIONS_PATH, "utf8");

    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|getCurrentUserId|getSessionState|requireSession/);
    expect(source).toMatch(/["']use cache["']/);
  });
});
