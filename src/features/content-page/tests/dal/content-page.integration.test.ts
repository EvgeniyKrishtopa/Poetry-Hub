// @vitest-environment node
import { describe, expect, it } from "vitest";

import { getContentPage } from "../../dal/content-page";

// A real request: no `fetch` or module mocks. Vitest doesn't load `.env.local`, so run it with
// `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run <this file>`; without the
// variables (CI, plain `npm test`) it is skipped.
const hasContentfulSettings = Boolean(process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_ACCESS_TOKEN);
const NETWORK_TIMEOUT_MS = 15_000;

describe.skipIf(!hasContentfulSettings)("getContentPage against the real Contentful space", () => {
  // implements FR-1 of add-about-page
  it(
    "returns the published `about_page` entry with a non-blank title and message",
    async () => {
      const result = await getContentPage();

      expect(result).toMatchObject({ ok: true });
      if (!result.ok) return;
      expect(result.entry.title.trim()).not.toBe("");
      expect(result.entry.message.trim()).not.toBe("");
    },
    NETWORK_TIMEOUT_MS,
  );
});
