import { describe, expect, it } from "vitest";

import { ACCOUNT_PATH, ADMIN_PATH } from "@/shared/config/account-paths";
import { API_PATH, AUTH_PATH } from "@/shared/lib/seo";

import { buildRobots } from "../../model/robots-rules";

const SITE_URL = "https://example.org";

describe("buildRobots", () => {
  // implements FR-8 of seo-metadata
  it("allows the site, disallows exactly the account, auth and api paths, and names the sitemap absolutely", () => {
    expect(buildRobots(SITE_URL)).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: [ACCOUNT_PATH, AUTH_PATH, API_PATH] },
      sitemap: "https://example.org/sitemap.xml",
    });
  });

  // implements FR-8 of seo-metadata
  it("does not name /admin, since the file is public and the path would be announced", () => {
    const serialized = JSON.stringify(buildRobots(SITE_URL));

    expect(serialized).not.toContain(ADMIN_PATH);
  });

  // implements FR-11 of seo-metadata
  it("builds the sitemap line on the given origin", () => {
    const robots = buildRobots("https://poetry.vercel.app");

    expect(robots.sitemap).toBe("https://poetry.vercel.app/sitemap.xml");
  });
});
