// pages: /
import { expect, test, type Page } from "@playwright/test";

const VIEWPORT_HEIGHT = 900;
const VIEWPORTS = [360, 768, 1280] as const;
/** Sub-pixel layout and a possible scrollbar leave a pixel or two between the centre lines. */
const CENTRE_TOLERANCE_PX = 2;

const READ_BUTTON = "Читать произведения";
const BECOME_AUTHOR_BUTTON = "Стать автором";
const ABOUT_LINK = "Подробнее о проекте";
const INVITATION_BUTTON = "Присоединиться к проекту";

/** The horizontal centre of the box the given buttons span together. */
async function centreOfButtons(page: Page, names: readonly string[]): Promise<number> {
  const boxes = await Promise.all(
    names.map(async (name) => {
      const box = await page.getByRole("main").getByRole("link", { name }).first().boundingBox();
      if (box === null) throw new Error(`no box for the «${name}» button`);
      return box;
    }),
  );
  const left = Math.min(...boxes.map((box) => box.x));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  return (left + right) / 2;
}

// implements FR-B4, FR-B6 of home-contentful-content; FR-1, FR-3, FR-6 of home-sections.
// Whatever the content source: the Home banner, the about and closing entries from Contentful when they are
// published, the static fallbacks when not. The run's report says which one it was.
for (const width of VIEWPORTS) {
  test(`the home hero is centred, with its sections, at ${width} px`, { tag: ["@home-contentful-content"] }, async ({ page }) => {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
    await page.goto("/");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);

    const title = main.getByRole("heading", { level: 1 });
    await expect(title).toHaveCSS("text-align", "center");
    const heroText = title.locator("xpath=following-sibling::div[1]//p").first();
    await expect(heroText).toHaveCSS("text-align", "center");

    const titleBox = await title.boundingBox();
    if (titleBox === null) throw new Error("the title has no box");
    const viewportCentre = width / 2;
    expect(Math.abs(titleBox.x + titleBox.width / 2 - viewportCentre)).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);

    const buttonsCentre = await centreOfButtons(page, [READ_BUTTON, BECOME_AUTHOR_BUTTON]);
    expect(Math.abs(buttonsCentre - viewportCentre)).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);

    await expect(main.getByRole("link", { name: ABOUT_LINK })).toBeVisible();
    await expect(main.getByRole("link", { name: INVITATION_BUTTON })).toBeVisible();

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(width);
  });
}
