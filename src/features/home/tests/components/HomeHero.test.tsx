import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeHero } from "../../components/HomeHero/HomeHero";
import { HERO_IMAGE_PATH } from "../../model/home.constants";
import { HERO_COPY } from "../../model/home-messages";

// The real authors index pulls in the whole feature; the hero needs only the path of the authors list.
vi.mock("@/features/authors", () => ({ AUTHORS_PATH: "/authors" }));

const CMS_TITLE = "Welcome to Poetry Hub";
const FALLBACK_TITLE = "Поэтический Хаб";
const FALLBACK_DESCRIPTION = "Discover, read, and collect poems.";

function renderHero(message: string, title = CMS_TITLE) {
  return render(<HomeHero greeting={{ title, message }} />);
}

describe("HomeHero", () => {
  // implements FR-1, home-greeting FR-6 of home-page-sections
  it("renders the greeting title as the one h1 with the message beneath it", () => {
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

  // implements FR-1, home-greeting FR-7 of home-page-sections
  it("shows the static fallback title and description with both buttons", () => {
    renderHero(FALLBACK_DESCRIPTION, FALLBACK_TITLE);

    expect(screen.getByRole("heading", { level: 1, name: FALLBACK_TITLE })).toBeInTheDocument();
    expect(screen.getByText(FALLBACK_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: HERO_COPY.readWorks })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: HERO_COPY.becomeAuthor })).toBeInTheDocument();
  });

  // implements home-greeting FR-6 of home-page-sections
  it("splits blank-line-separated blocks into paragraphs and keeps single line breaks", () => {
    const { container } = renderHero("Line one\nLine two\n\nSecond paragraph");

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Line one\nLine two");
    expect(paragraphs[1].textContent).toBe("Second paragraph");
  });

  // implements home-greeting FR-6 of home-page-sections
  it("renders Markdown and HTML literally", () => {
    const { container } = renderHero("**Bold** <b>tag</b>");

    expect(screen.getByText("**Bold** <b>tag</b>")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });

  // implements home-greeting FR-6 of home-page-sections
  it("draws the greeting in a section over the photo, with no search box and no clear button", () => {
    const { container } = renderHero("Hello, reader.");

    const heading = screen.getByRole("heading", { level: 1 });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelector("img")).not.toBeNull();
    expect(container.querySelector("[role='searchbox'], input")).toBeNull();
    expect(screen.queryByRole("button", { name: "Очистить" })).toBeNull();
  });

  // implements NFR-3, NFR-5 of home-page-sections
  it("serves the photo with the empty alt, a sizes hint and a preload link", () => {
    const { container } = renderHero("Hello, reader.");

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("sizes", "100vw");
    // next/image's `preload` adds a preload link to the head instead of marking the img itself.
    expect(document.head.querySelector("link[rel='preload'][as='image'][imagesizes='100vw']")).not.toBeNull();
    expect(decodeURIComponent(image?.getAttribute("src") ?? "")).toContain(HERO_IMAGE_PATH);
  });
});
