import { expect, test } from "@playwright/test";

const MATCHING_QUERY = "Road";
const MATCHING_TITLE = "The Road Not Taken";
const NON_MATCHING_QUERY = "xyzabc123nonsense";
const EMPTY_STATE_TEXT = "No poems match your search.";
const HYDRATION_PROBE_TIMEOUT_MS = 1000;

// implements FR-4 of migrate-to-cache-components: the cached `/` still hydrates, so client-side
// filtering (Zustand search state over the prefetched TanStack Query list) keeps working.
test("home poem search filters the list and clearing restores it", async ({ page }) => {
  await page.goto("/");

  const poems = page.getByRole("main").getByRole("listitem");
  const search = page.getByRole("searchbox", { name: "Search poems" });
  const clear = page.getByRole("button", { name: "Clear" });
  const initialCount = await poems.count();
  expect(initialCount).toBeGreaterThan(1);

  // Typing before hydration can be dropped, so retry until React owns the input
  // (the Clear button only enables once the search state is set).
  await expect(async () => {
    await search.fill(MATCHING_QUERY);
    await expect(clear).toBeEnabled({ timeout: HYDRATION_PROBE_TIMEOUT_MS });
  }).toPass();
  await expect(poems).toHaveCount(1);
  await expect(poems.first()).toContainText(MATCHING_TITLE);

  await search.fill(NON_MATCHING_QUERY);
  await expect(page.getByText(EMPTY_STATE_TEXT)).toBeVisible();

  await clear.click();
  await expect(search).toHaveValue("");
  await expect(poems).toHaveCount(initialCount);
});
