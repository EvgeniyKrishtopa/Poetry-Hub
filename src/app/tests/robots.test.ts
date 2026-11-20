// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildRobots } from "@/features/seo";

import robots from "../robots";

const SITE_URL_ENV = "SITE_URL";
const SITE_URL = "https://example.org";

describe("robots route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-8 of seo-metadata
  it("returns the robots rules built on the configured site URL", () => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);

    expect(robots()).toEqual(buildRobots(SITE_URL));
  });
});
