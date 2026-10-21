import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentPageContent } from "../../components/ContentPageContent/ContentPageContent";
import { getContentPage } from "../../dal/content-page";
import { CONTENT_PAGE_KEYS } from "../../model/content-page.constants";
import type { ContentPageFailureReason } from "../../model/content-page.types";

vi.mock("../../dal/content-page", () => ({ getContentPage: vi.fn() }));

const getContentPageMock = vi.mocked(getContentPage);

const FAILURE_REASONS: readonly ContentPageFailureReason[] = [
  "config",
  "network",
  "auth",
  "graphql",
  "http",
  "validation",
  "not-found",
];

describe.each(Object.values(CONTENT_PAGE_KEYS))("ContentPageContent(%s)", (entryKey) => {
  const entry = { key: entryKey, title: "Заголовок страницы", message: "Первый абзац.\n\nВторой абзац." };

  beforeEach(() => {
    getContentPageMock.mockReset();
  });

  // implements FR-1, FR-6 of add-privacy-policy-page
  it("reads its own key and resolves to the article with the entry's title on success", async () => {
    getContentPageMock.mockResolvedValue({ ok: true, entry });

    render(await ContentPageContent({ entryKey }));

    expect(getContentPageMock).toHaveBeenCalledExactlyOnceWith(entryKey);
    expect(screen.getByRole("heading", { level: 1, name: entry.title })).toBeInTheDocument();
  });

  // implements FR-2, FR-6 of add-privacy-policy-page
  it.each(FAILURE_REASONS)(
    "rejects on a %s failure without the key, reason, or entry text in the message",
    async (reason) => {
      getContentPageMock.mockResolvedValue({ ok: false, reason });

      const rendering = ContentPageContent({ entryKey });

      await expect(rendering).rejects.toBeInstanceOf(Error);
      for (const leaked of [reason, entryKey, entry.title]) {
        await expect(rendering).rejects.not.toThrow(leaked);
      }
    },
  );
});
