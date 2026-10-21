import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AboutContent } from "../../components/AboutContent/AboutContent";
import { getAboutPage } from "../../dal/about-page";
import type { AboutPageFailureReason } from "../../model/about-page.types";

vi.mock("../../dal/about-page", () => ({ getAboutPage: vi.fn() }));

const getAboutPageMock = vi.mocked(getAboutPage);

const ENTRY = { key: "about_page", title: "О проекте", message: "Первый абзац.\n\nВторой абзац." };

const FAILURE_REASONS: readonly AboutPageFailureReason[] = [
  "config",
  "network",
  "auth",
  "graphql",
  "http",
  "validation",
  "not-found",
];

describe("AboutContent", () => {
  beforeEach(() => {
    getAboutPageMock.mockReset();
  });

  // implements FR-1 of add-about-page
  it("resolves to the article with the entry's title on success", async () => {
    getAboutPageMock.mockResolvedValue({ ok: true, entry: ENTRY });

    render(await AboutContent());

    expect(screen.getByRole("heading", { level: 1, name: "О проекте" })).toBeInTheDocument();
  });

  // implements FR-2 of add-about-page
  it.each(FAILURE_REASONS)("rejects on a %s failure without the reason or entry text in the message", async (reason) => {
    getAboutPageMock.mockResolvedValue({ ok: false, reason });

    const rendering = AboutContent();

    await expect(rendering).rejects.toBeInstanceOf(Error);
    for (const leaked of [reason, ENTRY.key, ENTRY.title]) {
      await expect(rendering).rejects.not.toThrow(leaked);
    }
  });
});
