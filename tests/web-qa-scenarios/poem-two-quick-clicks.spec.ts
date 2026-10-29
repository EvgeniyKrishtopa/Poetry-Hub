// pages: /authors/10000000-0000-4000-8000-000000000005, /authors/10000000-0000-4000-8000-000000000005/poems/30000000-0000-4000-8000-000000000052
import { expect, test } from "@playwright/test";

/** `author5@example.test` in `supabase/seed.sql`, whose page lists its four seeded poems. */
const AUTHOR_PATH = "/authors/10000000-0000-4000-8000-000000000005";
const FIRST_TITLE = "Осенний сад";
const SECOND_TITLE = "Ночной вокзал";
/** Long enough that the second click lands before the first navigation's response. */
const SLOW_NETWORK_LATENCY_MS = 2500;
const NO_THROTTLING = -1;
/** Several throttled round trips: the second navigation's page and trail. */
const SETTLE_TIMEOUT_MS = 20_000;

// implements FR-13 of add-author-poems
// implements FR-5 of refine-author-page-and-contact
// The last of two quick clicks in the author page's poems section wins, and the first poem never shows.
test("two quick clicks in the author page's poems section end on the second poem", {
  tag: ["@add-author-poems", "@refine-author-page-and-contact"],
}, async ({ page }) => {
  const main = page.getByRole("main");
  const trail = page.getByRole("navigation", { name: "Навигационная цепочка" });

  await page.goto(AUTHOR_PATH);
  await expect(main.getByRole("heading", { level: 2, name: "Произведения" })).toBeVisible();
  await expect(main.getByRole("link", { name: SECOND_TITLE })).toBeVisible();

  // Record every visible h1 from now on, so a brief flash of the first poem is caught too.
  await page.evaluate(() => {
    const seen = new Set<string>();
    (window as unknown as { seenHeadings: Set<string> }).seenHeadings = seen;
    const record = () => {
      for (const heading of document.querySelectorAll<HTMLElement>("main h1")) {
        if (heading.offsetParent !== null && heading.textContent) seen.add(heading.textContent);
      }
    };
    new MutationObserver(record).observe(document.body, { subtree: true, childList: true, characterData: true });
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: SLOW_NETWORK_LATENCY_MS,
    downloadThroughput: NO_THROTTLING,
    uploadThroughput: NO_THROTTLING,
  });

  await main.getByRole("link", { name: FIRST_TITLE }).click({ noWaitAfter: true });
  await main.getByRole("link", { name: SECOND_TITLE }).click({ noWaitAfter: true });

  await expect(main.getByRole("heading", { level: 1, name: SECOND_TITLE })).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await expect(trail.getByText(SECOND_TITLE)).toHaveAttribute("aria-current", "page");

  const seenHeadings = await page.evaluate(() => [...(window as unknown as { seenHeadings: Set<string> }).seenHeadings]);
  expect(seenHeadings).not.toContain(FIRST_TITLE);
});
