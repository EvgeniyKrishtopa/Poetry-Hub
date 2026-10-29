// pages: /authors/10000000-0000-4000-8000-000000000005, /authors/10000000-0000-4000-8000-000000000005/poems/30000000-0000-4000-8000-000000000051
import { expect, test } from "@playwright/test";

/** `author5@example.test` in `supabase/seed.sql`; that profile has all four seeded poems. */
const AUTHOR_ID = "10000000-0000-4000-8000-000000000005";
const AUTHOR_NAME = "Ольга Северина";
const AUTHOR_PATH = `/authors/${AUTHOR_ID}`;
const POEM_TITLE = "Осенний сад";
/** The seed's fixed id for author5's first poem (`30000000-0000-4000-8000-0000000000NM`, N = 5, M = 1). */
const POEM_ID = "30000000-0000-4000-8000-000000000051";
const POEM_PATH = `${AUTHOR_PATH}/poems/${POEM_ID}`;
const POEM_TITLES_NEWEST_FIRST = ["Утренний двор", "Ночной вокзал", "Осенний сад", "Зимний мост"];
/** The poem page's trail, with no poem list item between the author and the poem. */
const POEM_TRAIL = ["Главная", "Наши авторы", AUTHOR_NAME, POEM_TITLE];

// implements FR-1, FR-4, FR-8 of add-author-poems
// implements FR-5, FR-7 of refine-author-page-and-contact
// Author page's poems section → poem, with the short trail, and back by the trail.
test("an author's poems are listed on the author page and the trail leads back", {
  tag: ["@add-author-poems", "@refine-author-page-and-contact", "@add-poem-creation"],
}, async ({ page }) => {
  const main = page.getByRole("main");
  const trail = page.getByRole("navigation", { name: "Навигационная цепочка" });

  await page.goto(AUTHOR_PATH);

  await expect(main.getByRole("heading", { level: 1, name: AUTHOR_NAME })).toBeVisible();
  await expect(main.getByRole("heading", { level: 2, name: "Произведения" })).toBeVisible();
  await expect(main.getByRole("list").getByRole("link")).toHaveText(POEM_TITLES_NEWEST_FIRST);
  await expect(main.getByRole("link", { name: "Произведения автора" })).toHaveCount(0);

  await main.getByRole("link", { name: POEM_TITLE }).click();

  await expect(page).toHaveURL(POEM_PATH);
  await expect(main.getByRole("heading", { level: 1, name: POEM_TITLE })).toBeVisible();
  await expect(main.locator("time")).toHaveAttribute("datetime", "2026-03-12");
  await expect(main.locator("time")).toHaveText("12 марта 2026 г.");
  // implements FR-9, FR-10 of add-poem-creation: a seeded poem has no illustration and no genre, so neither is shown.
  await expect(main.getByRole("img")).toHaveCount(0);
  await expect(main.getByText(/^Жанр: /)).toHaveCount(0);
  // Each item after the first also holds the hidden separator, so the items are matched by containment.
  await expect(trail.getByRole("listitem")).toHaveCount(POEM_TRAIL.length);
  await expect(trail.getByRole("listitem")).toContainText(POEM_TRAIL);
  await expect(trail.getByRole("link", { name: AUTHOR_NAME })).toHaveAttribute("href", AUTHOR_PATH);
  await expect(trail.getByText(POEM_TITLE)).toHaveAttribute("aria-current", "page");

  await trail.getByRole("link", { name: AUTHOR_NAME }).click();
  await expect(page).toHaveURL(AUTHOR_PATH);
  await expect(main.getByRole("heading", { level: 2, name: "Произведения" })).toBeVisible();
});

// implements FR-6 of add-author-poems: a signed-out visitor opens a poem page directly, with no redirect.
test("a signed-out visitor opens a poem page directly", {
  tag: ["@add-author-poems", "@refine-author-page-and-contact"],
}, async ({ page }) => {
  const response = await page.goto(POEM_PATH);

  expect(response?.ok()).toBe(true);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL(POEM_PATH);
  await expect(page.getByRole("banner").getByRole("link", { name: "Войти" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: POEM_TITLE })).toBeVisible();
});
