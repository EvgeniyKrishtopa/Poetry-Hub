import { describe, expect, it } from "vitest";

import { siteConfig } from "@/shared/config/site";

import type { GreetingFailureReason } from "../../model/greeting.types";
import type { HomeBannerFailureReason } from "../../model/home-banner.types";
import { HERO_IMAGE_PATH } from "../../model/home.constants";
import { ABOUT_COPY, JOIN_COPY } from "../../model/home-messages";
import { resolveBanner, resolveSectionCopy } from "../../model/resolve-home-content";

const BANNER_IMAGE = "https://images.ctfassets.net/abc123space/asset/token/hero.jpg";
const FAILURE_REASONS = ["config", "network", "auth", "graphql", "http", "validation", "not-found"] as const;

describe("resolveBanner", () => {
  // implements FR-B4 of home-contentful-content
  it("returns the CMS banner's title, text and image address on success", () => {
    const result = resolveBanner({
      ok: true,
      banner: { title: "Welcome", description: "Poetry for readers", bannerImage: BANNER_IMAGE },
    });

    expect(result).toEqual({ title: "Welcome", text: "Poetry for readers", imageSrc: BANNER_IMAGE });
  });

  // implements FR-B5 of home-contentful-content
  it.each<HomeBannerFailureReason>([...FAILURE_REASONS])(
    "falls back to the site name, description and shipped photo for a `%s` failure",
    (reason) => {
      expect(resolveBanner({ ok: false, reason })).toEqual({
        title: siteConfig.name,
        text: siteConfig.description,
        imageSrc: HERO_IMAGE_PATH,
      });
    },
  );
});

describe("resolveSectionCopy", () => {
  // implements FR-3 of home-sections
  it("returns the CMS greeting's title and message on success", () => {
    const result = resolveSectionCopy(
      { ok: true, greeting: { key: "about_project_home", title: "About us", message: "Line one\n\nLine two" } },
      ABOUT_COPY,
    );

    expect(result).toEqual({ heading: "About us", text: "Line one\n\nLine two" });
  });

  // implements FR-3 of home-sections
  it.each<GreetingFailureReason>([...FAILURE_REASONS])(
    "falls back to the about section's own copy for a `%s` failure",
    (reason) => {
      expect(resolveSectionCopy({ ok: false, reason }, ABOUT_COPY)).toEqual({
        heading: ABOUT_COPY.heading,
        text: ABOUT_COPY.text,
      });
    },
  );

  // implements FR-6 of home-sections
  it.each<GreetingFailureReason>([...FAILURE_REASONS])(
    "falls back to the closing invitation's own copy for a `%s` failure",
    (reason) => {
      expect(resolveSectionCopy({ ok: false, reason }, JOIN_COPY)).toEqual({
        heading: JOIN_COPY.heading,
        text: JOIN_COPY.text,
      });
    },
  );
});
