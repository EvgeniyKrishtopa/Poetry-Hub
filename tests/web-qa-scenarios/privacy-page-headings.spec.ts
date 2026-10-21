// pages: /privacy
import { expect, test } from "@playwright/test";

const PRIVACY_PATH = "/privacy";
const HTTP_OK = 200;
const TRAIL_NAME = "Навигационная цепочка";
const PRIVACY_LABEL = "Политика конфиденциальности";
const BOLD_FONT_WEIGHT = "700";

// implements FR-1, FR-4 and FR-7 of add-privacy-policy-page: the page title is the only h1, the
// numbered section and subsection lines of the real Contentful text are bold h2/h3 headings, and
// the trail marks the page as current. Reads the live entry, so it needs Contentful (@external).
test(
  "the privacy page shows its title, bold section and subsection headings, and its trail",
  { tag: ["@add-privacy-policy-page", "@external"] },
  async ({ page }) => {
    const response = await page.goto(PRIVACY_PATH);
    expect(response?.status()).toBe(HTTP_OK);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);

    const sections = main.locator("article h2");
    const subsections = main.locator("article h3");
    await expect(sections.first()).toBeVisible();
    await expect(subsections.first()).toBeVisible();
    await expect(sections.first()).toHaveCSS("font-weight", BOLD_FONT_WEIGHT);
    await expect(subsections.first()).toHaveCSS("font-weight", BOLD_FONT_WEIGHT);

    await expect(page.getByRole("navigation", { name: TRAIL_NAME }).getByText(PRIVACY_LABEL)).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
);
