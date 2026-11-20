// @vitest-environment node
import { notFound } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/shared/config/site";
import { OG_LOCALE, SITE_URL_ENV } from "@/shared/lib/seo/seo.constants";
import { FALLBACK_METADATA, TITLE_TEMPLATE } from "@/shared/lib/seo";

import { getContentPage } from "../../dal/content-page";
import { getContentPageMetadata } from "../../metadata/content-page-metadata";
import { CONTENT_PAGE_KEYS } from "../../model/content-page.constants";
import { CONTENT_PAGE_DESCRIPTIONS } from "../../model/content-page-messages";
import type { ContentPageFailureReason } from "../../model/content-page.types";

vi.mock("../../dal/content-page", () => ({ getContentPage: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const SITE_URL = "https://example.org";
const ABOUT_TITLE = "О проекте";
const PRIVACY_TITLE = "Политика конфиденциальности";
const readMock = vi.mocked(getContentPage);

function entryResult(key: string, title: string) {
  return { ok: true, entry: { key, title, message: "Текст." } } as const;
}

describe("getContentPageMetadata", () => {
  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // implements FR-1, FR-2, FR-3, FR-4 of seo-metadata
  it.each([
    ["the about page", CONTENT_PAGE_KEYS.about, ABOUT_TITLE, "/about"],
    ["the privacy page", CONTENT_PAGE_KEYS.privacyPolicy, PRIVACY_TITLE, "/privacy"],
  ])("builds %s from its entry's title and its own fixed description", async (_name, key, title, path) => {
    readMock.mockResolvedValue(entryResult(key, title));

    const metadata = await getContentPageMetadata(key);

    expect(readMock).toHaveBeenCalledExactlyOnceWith(key);
    expect(metadata.title).toBe(title);
    expect(metadata.description).toBe(CONTENT_PAGE_DESCRIPTIONS[key]);
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${path}`);
    expect(metadata.openGraph).toMatchObject({ type: "website", title, url: `${SITE_URL}${path}`, locale: OG_LOCALE });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title });
  });

  // implements FR-1 of seo-metadata: the root template adds the site name, so the page title must not
  it("leaves the title without the site name, which the root template appends", async () => {
    readMock.mockResolvedValue(entryResult(CONTENT_PAGE_KEYS.about, ABOUT_TITLE));

    const metadata = await getContentPageMetadata(CONTENT_PAGE_KEYS.about);

    expect(metadata.title).toBe(ABOUT_TITLE);
    expect(TITLE_TEMPLATE.replace("%s", ABOUT_TITLE)).toBe(`${ABOUT_TITLE} | ${siteConfig.name}`);
  });

  // implements FR-10 of seo-metadata
  it("calls notFound() for a missing entry, so the page is marked noindex", async () => {
    readMock.mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getContentPageMetadata(CONTENT_PAGE_KEYS.about)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(notFound).toHaveBeenCalledOnce();
  });

  // implements FR-1, FR-10 of seo-metadata: a failed read is not a missing page
  it.each<ContentPageFailureReason>(["config", "network", "auth", "graphql", "http", "validation"])(
    "returns the site's fallback for a failed read (%s), never notFound()",
    async (reason) => {
      readMock.mockResolvedValue({ ok: false, reason });

      const metadata = await getContentPageMetadata(CONTENT_PAGE_KEYS.privacyPolicy);

      expect(metadata).toBe(FALLBACK_METADATA);
      expect(notFound).not.toHaveBeenCalled();
    },
  );
});
