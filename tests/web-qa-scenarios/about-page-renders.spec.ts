// pages: /about
import { expect, test } from "@playwright/test";

const ABOUT_PATH = "/about";
const TRAIL_NAME = "Навигационная цепочка";
const HOME_LABEL = "Главная";
const ABOUT_LABEL = "О проекте";

// implements FR-1, FR-4 of add-about-page: the CMS entry renders as the only heading and its paragraphs,
// under the trail HOME_LABEL › ABOUT_LABEL. External: the server reads the entry from Contentful.
test(
  "the about page shows the entry's title, its paragraphs, and the trail",
  { tag: ["@add-about-page", "@external"] },
  async ({ page }) => {
    await page.goto(ABOUT_PATH);

    const main = page.getByRole("main");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.getByRole("heading", { level: 1 })).not.toBeEmpty();

    const paragraphs = main.getByRole("article").locator("p");
    await expect(paragraphs.first()).toBeVisible();
    await expect(paragraphs.first()).not.toBeEmpty();

    const trail = page.getByRole("navigation", { name: TRAIL_NAME });
    await expect(trail.getByRole("link", { name: HOME_LABEL })).toHaveAttribute("href", "/");
    await expect(trail.getByText(ABOUT_LABEL)).toHaveAttribute("aria-current", "page");
  },
);
