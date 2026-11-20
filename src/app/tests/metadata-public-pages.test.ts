// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLoginPageMetadata, getSignupPageMetadata } from "@/features/auth";
import { getAuthorsPageMetadata } from "@/features/authors";
import { CONTENT_PAGE_KEYS, getContentPageMetadata } from "@/features/content-page";
import { getHomePageMetadata } from "@/features/home";
import { siteConfig } from "@/shared/config/site";
import { contentfulQuery } from "@/shared/lib/contentful";
import { DEFAULT_SHARE_IMAGE_PATH, DESCRIPTION_MAX_LENGTH, SITE_URL_ENV } from "@/shared/lib/seo/seo.constants";

import { generateMetadata as aboutGenerateMetadata } from "../(public)/about/page";
import { generateMetadata as privacyGenerateMetadata } from "../(public)/privacy/page";

vi.mock("@/shared/lib/contentful", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/contentful")>()),
  contentfulQuery: vi.fn(),
}));

const SITE_URL = "https://example.org";

beforeEach(() => {
  vi.stubEnv(SITE_URL_ENV, SITE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the home page's metadata", () => {
  // implements FR-1 of seo-metadata
  it("sets the site name as an absolute title, so the template does not repeat it", () => {
    const metadata = getHomePageMetadata();

    expect(metadata.title).toEqual({ absolute: siteConfig.name });
  });

  // implements FR-4 of seo-metadata
  it("keeps og:title and twitter:title the plain site name", () => {
    const metadata = getHomePageMetadata();

    expect(metadata.openGraph?.title).toBe(siteConfig.name);
    expect(metadata.twitter?.title).toBe(siteConfig.name);
  });

  // implements FR-2 of seo-metadata
  it("carries a description of bounded length that is not the greeting's fallback text", () => {
    const metadata = getHomePageMetadata();

    expect(metadata.description).toBeTruthy();
    expect(metadata.description?.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(metadata.description).not.toBe(siteConfig.description);
  });

  // implements FR-3, FR-4, FR-5 of seo-metadata
  it("declares the site root as canonical, a website card and the default share image", () => {
    const metadata = getHomePageMetadata();

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/`);
    expect(metadata.openGraph).toMatchObject({ type: "website", url: `${SITE_URL}/` });
    expect(metadata.openGraph?.images).toEqual([`${SITE_URL}${DEFAULT_SHARE_IMAGE_PATH}`]);
  });
});

describe("the authors directory's metadata", () => {
  // implements FR-1, FR-3, FR-4 of seo-metadata
  it("uses its own title and canonical, with a website card", () => {
    const metadata = getAuthorsPageMetadata();

    expect(metadata.title).toBe("Наши авторы");
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/authors`);
    expect(metadata.openGraph).toMatchObject({ type: "website", title: "Наши авторы", url: `${SITE_URL}/authors` });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe.each([
  ["/login", getLoginPageMetadata],
  ["/signup", getSignupPageMetadata],
])("the metadata of %s", (path, getMetadata) => {
  // implements FR-7 of seo-metadata
  it("is noindex, follow with a title", () => {
    const metadata = getMetadata();

    expect(typeof metadata.title).toBe("string");
    expect(metadata.title).toBeTruthy();
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  // implements FR-3, FR-7 of seo-metadata
  it("declares its own canonical URL", () => {
    const metadata = getMetadata();

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${path}`);
  });

  // implements FR-7 of seo-metadata: the two exceptions to the description, card and image rules
  it("carries no description, Open Graph or Twitter card", () => {
    const metadata = getMetadata();

    expect(metadata.description).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.twitter).toBeUndefined();
  });
});

describe.each([
  ["/about", aboutGenerateMetadata, CONTENT_PAGE_KEYS.about],
  ["/privacy", privacyGenerateMetadata, CONTENT_PAGE_KEYS.privacyPolicy],
])("the route file of %s", (path, generateMetadata, key) => {
  // implements FR-1, FR-3 of seo-metadata: each route passes its own entry key, so a swap shows in the canonical
  it("builds the metadata of its own entry and path", async () => {
    vi.mocked(contentfulQuery).mockResolvedValue({
      greetingCollection: { items: [{ key, title: `Заголовок ${key}`, message: "Текст." }] },
    });

    const metadata = await generateMetadata();

    expect(vi.mocked(contentfulQuery)).toHaveBeenLastCalledWith(expect.any(String), { key });
    expect(metadata.title).toBe(`Заголовок ${key}`);
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${path}`);
  });
});

describe("the fixed pages' descriptions", () => {
  // implements FR-2 of seo-metadata: no two pages share one sentence
  it("are pairwise different, none empty, for the home, authors, about and privacy pages", async () => {
    vi.mocked(contentfulQuery).mockImplementation(async (_query, variables) => {
      const { key } = variables as { key: string };
      return { greetingCollection: { items: [{ key, title: "Заголовок", message: "Текст." }] } };
    });

    const about = await getContentPageMetadata(CONTENT_PAGE_KEYS.about);
    const privacy = await getContentPageMetadata(CONTENT_PAGE_KEYS.privacyPolicy);
    const descriptions = [
      getHomePageMetadata().description,
      getAuthorsPageMetadata().description,
      about.description,
      privacy.description,
    ];

    expect(descriptions.every((description) => typeof description === "string" && description.length > 0)).toBe(true);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});
