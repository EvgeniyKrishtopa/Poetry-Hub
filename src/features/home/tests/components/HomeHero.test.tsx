import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeHero } from "../../components/HomeHero/HomeHero";
import type { HomeBannerContent } from "../../model/home-banner.types";
import { HERO_IMAGE_PATH } from "../../model/home.constants";
import { HERO_COPY } from "../../model/home-messages";

// The real authors index pulls in the whole feature; the hero needs only the path of the authors list.
vi.mock("@/features/authors", () => ({ AUTHORS_PATH: "/authors" }));

const CMS_TITLE = "Welcome to Poetry Hub";
const CMS_IMAGE = "https://images.ctfassets.net/abc123space/asset/token/hero.jpg";
const FALLBACK_TITLE = "Поэтический Хаб";
const FALLBACK_DESCRIPTION = "Discover, read, and collect poems.";

function renderHero(text: string, overrides: Partial<HomeBannerContent> = {}) {
  const banner: HomeBannerContent = { title: CMS_TITLE, text, imageSrc: CMS_IMAGE, ...overrides };
  return render(<HomeHero banner={banner} />);
}

describe("HomeHero", () => {
  // implements FR-B4 of home-contentful-content
  it("renders the banner title as the one h1 with the text beneath it", () => {
    const { container } = renderHero("Hello, reader.");

    const heading = screen.getByRole("heading", { level: 1, name: CMS_TITLE });
    const message = screen.getByText("Hello, reader.");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(heading.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  // implements FR-1 of home-page-sections
  it("links «Читать произведения» to /authors and «Стать автором» to /signup", () => {
    renderHero("Hello, reader.");

    expect(screen.getByRole("link", { name: HERO_COPY.readWorks })).toHaveAttribute("href", "/authors");
    expect(screen.getByRole("link", { name: HERO_COPY.becomeAuthor })).toHaveAttribute("href", "/signup");
  });

  // implements FR-B5 of home-contentful-content
  it("shows the static fallback title, description and photo with both buttons", () => {
    const { container } = renderHero(FALLBACK_DESCRIPTION, { title: FALLBACK_TITLE, imageSrc: HERO_IMAGE_PATH });

    expect(screen.getByRole("heading", { level: 1, name: FALLBACK_TITLE })).toBeInTheDocument();
    expect(screen.getByText(FALLBACK_DESCRIPTION)).toBeInTheDocument();
    expect(decodeURIComponent(container.querySelector("img")?.getAttribute("src") ?? "")).toContain(HERO_IMAGE_PATH);
    expect(screen.getByRole("link", { name: HERO_COPY.readWorks })).toHaveAttribute("href", "/authors");
    expect(screen.getByRole("link", { name: HERO_COPY.becomeAuthor })).toHaveAttribute("href", "/signup");
  });

  // implements FR-B4 of home-contentful-content
  it("splits blank-line-separated blocks into paragraphs and keeps single line breaks", () => {
    const { container } = renderHero("Line one\nLine two\n\nSecond paragraph");

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Line one\nLine two");
    expect(paragraphs[1].textContent).toBe("Second paragraph");
  });

  // implements FR-B4 of home-contentful-content
  it("renders Markdown and HTML literally", () => {
    const { container } = renderHero("**Bold** <b>tag</b>");

    expect(screen.getByText("**Bold** <b>tag</b>")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });

  // implements FR-B4 of home-contentful-content
  it("draws the banner in a section over the photo, with no search box and no clear button", () => {
    const { container } = renderHero("Hello, reader.");

    const heading = screen.getByRole("heading", { level: 1 });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelector("img")).not.toBeNull();
    expect(container.querySelector("[role='searchbox'], input")).toBeNull();
    expect(screen.queryByRole("button", { name: "Очистить" })).toBeNull();
  });

  // implements FR-B4, NFR-B2 of home-contentful-content: the photo is the banner's address
  it("serves the banner's photo with the empty alt, a sizes hint and a preload link", () => {
    const { container } = renderHero("Hello, reader.");

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("sizes", "100vw");
    // next/image's `preload` adds a preload link to the head instead of marking the img itself.
    expect(document.head.querySelector("link[rel='preload'][as='image'][imagesizes='100vw']")).not.toBeNull();
    expect(decodeURIComponent(image?.getAttribute("src") ?? "")).toContain(CMS_IMAGE);
  });
});
