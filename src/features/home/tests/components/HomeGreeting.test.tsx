import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeGreeting } from "../../components/HomeGreeting/HomeGreeting";

function renderGreeting(message: string, title = "Welcome to Poetry Hub") {
  return render(<HomeGreeting greeting={{ title, message }} />);
}

describe("HomeGreeting", () => {
  // implements FR-6 of add-contentful-home-greeting
  it("renders the title as the level-1 heading with the message beneath it", () => {
    const { container } = renderGreeting("Hello, reader.");

    const heading = screen.getByRole("heading", { level: 1, name: "Welcome to Poetry Hub" });
    const message = screen.getByText("Hello, reader.");
    expect(heading.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  // implements FR-7 of add-contentful-home-greeting
  it("shows the static fallback title as the heading", () => {
    renderGreeting("Discover, read, and collect poems.", "Poetry Hub");

    expect(screen.getByRole("heading", { level: 1, name: "Poetry Hub" })).toBeInTheDocument();
  });

  // implements FR-6 of add-contentful-home-greeting
  it("splits blank-line-separated blocks into paragraphs and keeps single line breaks", () => {
    const { container } = renderGreeting("Line one\nLine two\n\nSecond paragraph");

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Line one\nLine two");
    expect(paragraphs[0]).toHaveClass("whitespace-pre-line");
    expect(paragraphs[1].textContent).toBe("Second paragraph");
  });

  // implements FR-9 of add-author-poems
  it.each([
    ["CMS greeting", "Welcome to Poetry Hub", "Hello, reader."],
    ["static fallback", "Поэтический Хаб", "Discover, read, and collect poems."],
  ])("draws the %s as a banner around the heading and text", (_case, title, message) => {
    renderGreeting(message, title);

    const heading = screen.getByRole("heading", { level: 1, name: title });
    const banner = heading.parentElement;
    expect(banner?.tagName).toBe("SECTION");
    expect(banner).toHaveClass("bg-surface", "border", "border-border", "rounded-2xl");
    expect(banner).toContainElement(screen.getByText(message));
  });

  // implements FR-6 of add-contentful-home-greeting
  it("renders Markdown and HTML literally", () => {
    const { container } = renderGreeting("**Bold** <b>tag</b>");

    expect(screen.getByText("**Bold** <b>tag</b>")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });
});
