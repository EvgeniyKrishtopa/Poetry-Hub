import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentPageContent } from "../../components/ContentPageContent/ContentPageContent";
import { getContentPage } from "../../dal/content-page";
import type { ContentPageFailureReason } from "../../model/content-page.types";

vi.mock("../../dal/content-page", () => ({ getContentPage: vi.fn() }));

const getContentPageMock = vi.mocked(getContentPage);

const ENTRY = { key: "about_page", title: "О проекте", message: "Первый абзац.\n\nВторой абзац." };

const FAILURE_REASONS: readonly ContentPageFailureReason[] = [
  "config",
  "network",
  "auth",
  "graphql",
  "http",
  "validation",
  "not-found",
];

describe("ContentPageContent", () => {
  beforeEach(() => {
    getContentPageMock.mockReset();
  });

  // implements FR-1 of add-about-page
  it("resolves to the article with the entry's title on success", async () => {
    getContentPageMock.mockResolvedValue({ ok: true, entry: ENTRY });

    render(await ContentPageContent());

    expect(screen.getByRole("heading", { level: 1, name: "О проекте" })).toBeInTheDocument();
  });

  // implements FR-2 of add-about-page
  it.each(FAILURE_REASONS)("rejects on a %s failure without the reason or entry text in the message", async (reason) => {
    getContentPageMock.mockResolvedValue({ ok: false, reason });

    const rendering = ContentPageContent();

    await expect(rendering).rejects.toBeInstanceOf(Error);
    for (const leaked of [reason, ENTRY.key, ENTRY.title]) {
      await expect(rendering).rejects.not.toThrow(leaked);
    }
  });
});
