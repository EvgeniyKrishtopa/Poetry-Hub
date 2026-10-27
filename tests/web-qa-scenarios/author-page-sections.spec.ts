// pages: /authors/10000000-0000-4000-8000-000000000001, /authors/10000000-0000-4000-8000-000000000005
import { expect, test } from "@playwright/test";

/** `author1@example.test` in `supabase/seed.sql`; that profile id gets no mock poems. */
const AUTHOR_WITHOUT_POEMS_PATH = "/authors/10000000-0000-4000-8000-000000000001";
/** `author5@example.test`; its about holds a `##` heading and a `-` list. */
const AUTHOR_WITH_ABOUT_PATH = "/authors/10000000-0000-4000-8000-000000000005";
const ABOUT_HEADING = "Поэтесса";
const POEMS_HEADING = "Произведения";
const NO_POEMS_TEXT = "У автора пока ещё нет публикаций.";

// implements FR-5 of refine-author-page-and-contact: an author with no poems gets the heading and the empty text, no list.
test("an author with no poems shows the poems heading and the empty text", {
  tag: ["@refine-author-page-and-contact"],
}, async ({ page }) => {
  const main = page.getByRole("main");

  await page.goto(AUTHOR_WITHOUT_POEMS_PATH);

  const section = main.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: POEMS_HEADING }),
  });
  await expect(section.getByText(NO_POEMS_TEXT)).toBeVisible();
  await expect(section.getByRole("list")).toHaveCount(0);
});

// implements FR-3 of refine-author-page-and-contact: the public about is left-aligned, list markers at the left edge.
test("the public about text is left-aligned with list markers at the left edge", {
  tag: ["@refine-author-page-and-contact"],
}, async ({ page }) => {
  const main = page.getByRole("main");

  await page.goto(AUTHOR_WITH_ABOUT_PATH);

  const heading = main.getByRole("heading", { level: 2, name: ABOUT_HEADING });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("text-align", /^(start|left)$/);

  const aboutList = main.getByRole("listitem").filter({ hasText: "элегии" }).locator("xpath=..");
  await expect(aboutList).toHaveCSS("padding-left", "0px");
  await expect(aboutList).toHaveCSS("list-style-position", "inside");
});
