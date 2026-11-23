import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeJoinCta } from "../../components/HomeJoinCta/HomeJoinCta";
import { getGreetingByKey } from "../../dal/home-greeting";
import { JOIN_GREETING_KEY } from "../../model/home.constants";
import { JOIN_COPY } from "../../model/home-messages";

vi.mock("../../dal/home-greeting", () => ({ getGreetingByKey: vi.fn() }));

const CMS_GREETING = { key: JOIN_GREETING_KEY, title: "Join from the CMS", message: "Text from the CMS." };

async function renderJoinCta() {
  const element = await HomeJoinCta();
  return render(element);
}

describe("HomeJoinCta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGreetingByKey).mockResolvedValue({ ok: true, greeting: CMS_GREETING });
  });

  // implements FR-6 of home-sections
  it("reads the closing key and shows the CMS heading and text, and its button leads to /signup", async () => {
    await renderJoinCta();

    expect(getGreetingByKey).toHaveBeenCalledWith(JOIN_GREETING_KEY);
    expect(screen.getByRole("heading", { level: 2, name: CMS_GREETING.title })).toBeInTheDocument();
    expect(screen.getByText(CMS_GREETING.message)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: JOIN_COPY.button })).toHaveAttribute("href", "/signup");
  });

  // implements FR-6 of home-sections
  it("shows the static copy when the read fails", async () => {
    vi.mocked(getGreetingByKey).mockResolvedValue({ ok: false, reason: "network" });

    await renderJoinCta();

    expect(screen.getByRole("heading", { level: 2, name: JOIN_COPY.heading })).toBeInTheDocument();
    expect(screen.getByText(JOIN_COPY.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: JOIN_COPY.button })).toHaveAttribute("href", "/signup");
  });

  // implements FR-8 of home-greeting
  it("splits blank-line-separated blocks into paragraphs and keeps single line breaks", async () => {
    vi.mocked(getGreetingByKey).mockResolvedValue({
      ok: true,
      greeting: { ...CMS_GREETING, message: "Line one\nLine two\n\nSecond paragraph" },
    });

    const { container } = await renderJoinCta();

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Line one\nLine two");
    expect(paragraphs[1].textContent).toBe("Second paragraph");
  });

  // implements FR-8 of home-greeting
  it("renders Markdown and HTML literally", async () => {
    vi.mocked(getGreetingByKey).mockResolvedValue({
      ok: true,
      greeting: { ...CMS_GREETING, message: "**Bold** <b>tag</b>" },
    });

    const { container } = await renderJoinCta();

    expect(screen.getByText("**Bold** <b>tag</b>")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });
});
