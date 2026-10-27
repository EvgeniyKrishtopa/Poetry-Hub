// pages: /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems, /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems/nochnoy-vokzal
import { expect, test } from "@playwright/test";

/** A public author in the local Supabase seed data, with four mock poems. */
const POEMS_PATH = "/authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems";
const FIRST_TITLE = "Осенний сад";
const SECOND_TITLE = "Ночной вокзал";
/** Long enough that the second click lands before the first navigation's response. */
const SLOW_NETWORK_LATENCY_MS = 2500;
const NO_THROTTLING = -1;
/** Several throttled round trips: the second navigation's page and trail. */
const SETTLE_TIMEOUT_MS = 20_000;

// implements FR-13 of add-author-poems: the last of two quick clicks wins, and the first poem never shows.
test("two quick clicks in the poem list end on the second poem", {
  tag: ["@add-author-poems"],
}, async ({ page }) => {
  const main = page.getByRole("main");
  const trail = page.getByRole("navigation", { name: "Навигационная цепочка" });

  await page.goto(POEMS_PATH);
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
