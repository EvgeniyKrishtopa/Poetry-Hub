// pages: /privacy, /about
import { expect, test } from "@playwright/test";

const PRIVACY_PATH = "/privacy";
const ABOUT_PATH = "/about";
const HTTP_OK = 200;
const TRAIL_NAME = "Навигационная цепочка";
const PRIVACY_LABEL = "Политика конфиденциальности";
const BOLD_FONT_WEIGHT = "700";

// implements FR-1, FR-4 and FR-7 of add-privacy-policy-page: the page title is the only h1, every
// numbered section and subsection line of the real Contentful text is a bold h2/h3 heading, the
// trail marks the page as current, and /about gets no such heading. Reads the live entries, so it
// needs Contentful (@external).
test(
  "the privacy page shows its title, bold section and subsection headings, and its trail",
  { tag: ["@add-privacy-policy-page", "@external"] },
  async ({ page }) => {
    const response = await page.goto(PRIVACY_PATH);
    expect(response?.status()).toBe(HTTP_OK);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);

    const headings = main.locator("article h2, article h3");
    await expect(main.locator("article h2").first()).toBeVisible();
    await expect(main.locator("article h3").first()).toBeVisible();
    const headingWeights = await headings.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).fontWeight),
    );
    expect(headingWeights.every((weight) => weight === BOLD_FONT_WEIGHT)).toBe(true);

    await expect(page.getByRole("navigation", { name: TRAIL_NAME }).getByText(PRIVACY_LABEL)).toHaveAttribute(
      "aria-current",
      "page",
    );

    // The about text has no numbered first line, so the shared rule adds no heading there.
    const aboutResponse = await page.goto(ABOUT_PATH);
    expect(aboutResponse?.status()).toBe(HTTP_OK);
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.locator("article h2, article h3")).toHaveCount(0);
  },
);
