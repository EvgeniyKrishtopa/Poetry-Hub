import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/shared/config/site";

import { buildNoIndexMetadata, buildPageMetadata, FALLBACK_METADATA, toCanonicalPath } from "../page-metadata";
import { DEFAULT_SHARE_IMAGE_PATH, OG_LOCALE, SITE_URL_ENV } from "../seo.constants";
import type { PageMetadataInput } from "../seo.types";

const SITE_URL = "https://example.org";
const POEM_PATH = "/authors/a1/poems/p1";
const ILLUSTRATION_URL = "https://storage.example.org/poem-illustrations/p1.png";

const POEM_INPUT: PageMetadataInput = {
  title: "Осень — Анна Иванова",
  description: "Осень пришла.",
  path: POEM_PATH,
  type: "article",
};

describe("page metadata builders", () => {
  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("toCanonicalPath", () => {
    // implements FR-3 of seo-metadata
    it("lowercases an uppercase id", () => {
      expect(toCanonicalPath("/authors/0A1B2C3D-AAAA-BBBB-CCCC-0123456789AB")).toBe(
        "/authors/0a1b2c3d-aaaa-bbbb-cccc-0123456789ab",
      );
    });

    // implements FR-3 of seo-metadata
    it.each([
      ["a query", "/login?error=confirm-failed", "/login"],
      ["a hash", "/about#team", "/about"],
      ["a query and a hash", "/login?error=x#y", "/login"],
      ["nothing to drop", "/authors", "/authors"],
      ["the root", "/", "/"],
    ])("drops %s", (_name, path, expected) => {
      expect(toCanonicalPath(path)).toBe(expected);
    });
  });

  describe("buildPageMetadata", () => {
    // implements FR-1, FR-4 of seo-metadata
    it("gives the page title and an og:title without the template suffix", () => {
      const metadata = buildPageMetadata(POEM_INPUT);

      expect(metadata.title).toBe(POEM_INPUT.title);
      expect(metadata.openGraph?.title).toBe(POEM_INPUT.title);
      expect(metadata.twitter?.title).toBe(POEM_INPUT.title);
    });

    // implements FR-2 of seo-metadata
    it("carries the description in the page, Open Graph and Twitter tags", () => {
      const metadata = buildPageMetadata(POEM_INPUT);

      expect(metadata.description).toBe(POEM_INPUT.description);
      expect(metadata.openGraph?.description).toBe(POEM_INPUT.description);
      expect(metadata.twitter?.description).toBe(POEM_INPUT.description);
    });

    // implements FR-3 of seo-metadata
    it("declares an absolute canonical equal to og:url", () => {
      const metadata = buildPageMetadata(POEM_INPUT);

      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${POEM_PATH}`);
      expect(metadata.openGraph?.url).toBe(`${SITE_URL}${POEM_PATH}`);
    });

    // implements FR-3 of seo-metadata
    it("drops a query and a hash from the canonical", () => {
      const metadata = buildPageMetadata({ ...POEM_INPUT, path: "/login?error=confirm-failed#top" });

      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/login`);
    });

    // implements FR-4 of seo-metadata
    it("sets every Open Graph field and the Twitter card", () => {
      const metadata = buildPageMetadata(POEM_INPUT);

      expect(metadata.openGraph).toMatchObject({
        type: "article",
        locale: OG_LOCALE,
        siteName: siteConfig.name,
        url: `${SITE_URL}${POEM_PATH}`,
      });
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    });

    // implements FR-4 of seo-metadata
    it.each(["website", "article", "profile"] as const)("sets og:type %s from the page type", (type) => {
      const metadata = buildPageMetadata({ ...POEM_INPUT, type });

      expect(metadata.openGraph).toMatchObject({ type });
    });

    // implements FR-5 of seo-metadata
    it("shares the given image in both cards", () => {
      const metadata = buildPageMetadata({ ...POEM_INPUT, image: ILLUSTRATION_URL });

      expect(metadata.openGraph?.images).toEqual([ILLUSTRATION_URL]);
      expect(metadata.twitter?.images).toEqual([ILLUSTRATION_URL]);
    });

    // implements FR-5 of seo-metadata
    it.each([
      ["left out", undefined],
      ["null", null],
    ])("shares the default image, as an absolute URL, when the image is %s", (_name, image) => {
      const metadata = buildPageMetadata({ ...POEM_INPUT, image });

      const defaultImage = `${SITE_URL}${DEFAULT_SHARE_IMAGE_PATH}`;
      expect(metadata.openGraph?.images).toEqual([defaultImage]);
      expect(metadata.twitter?.images).toEqual([defaultImage]);
    });
  });

  describe("buildNoIndexMetadata", () => {
    function expectNoDescriptionOrCard(metadata: Metadata): void {
      expect(metadata).not.toHaveProperty("description");
      expect(metadata).not.toHaveProperty("openGraph");
      expect(metadata).not.toHaveProperty("twitter");
    }

    // implements FR-6 of seo-metadata
    it("marks a signed-in page noindex, nofollow, with a title and no description or card", () => {
      const metadata = buildNoIndexMetadata({ title: "Личный кабинет", follow: false });

      expect(metadata.title).toBe("Личный кабинет");
      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata).not.toHaveProperty("alternates");
      expectNoDescriptionOrCard(metadata);
    });

    // implements FR-7 of seo-metadata
    it("marks an auth page noindex, follow, with its canonical and no description or card", () => {
      const metadata = buildNoIndexMetadata({ title: "Вход", follow: true, canonicalPath: "/login?error=x" });

      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/login`);
      expectNoDescriptionOrCard(metadata);
    });
  });

  describe("FALLBACK_METADATA", () => {
    // implements FR-1 of seo-metadata
    it("is the site name as an absolute title, so the root template does not repeat it", () => {
      expect(FALLBACK_METADATA.title).toEqual({ absolute: siteConfig.name });
      expect(FALLBACK_METADATA.description).toBe(siteConfig.description);
    });
  });
});
