// pages: /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa, /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems, /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems/osenniy-sad
import { expect, test } from "@playwright/test";

/** A public author in the local Supabase seed data; her id gets four mock poems. */
const AUTHOR_ID = "501634db-2e8f-4a20-b60e-a74c6d5d84fa";
const AUTHOR_NAME = "Анна Ахматова";
const AUTHOR_PATH = `/authors/${AUTHOR_ID}`;
const POEMS_PATH = `${AUTHOR_PATH}/poems`;
const POEM_PATH = `${POEMS_PATH}/osenniy-sad`;
const POEM_TITLES_NEWEST_FIRST = ["Утренний двор", "Ночной вокзал", "Осенний сад", "Зимний мост"];

// implements FR-1, FR-2, FR-4, FR-8 of add-author-poems: author page → poem list → poem, and back by the trail.
test("an author's poems are reachable from the author page and the trail leads back", {
  tag: ["@add-author-poems"],
}, async ({ page }) => {
  const main = page.getByRole("main");
  const trail = page.getByRole("navigation", { name: "Навигационная цепочка" });

  await page.goto(AUTHOR_PATH);
  await main.getByRole("link", { name: "Произведения автора" }).click();

  await expect(page).toHaveURL(POEMS_PATH);
  await expect(main.getByRole("heading", { level: 1, name: "Произведения" })).toBeVisible();
  await expect(main.getByRole("list").getByRole("link")).toHaveText(POEM_TITLES_NEWEST_FIRST);
  await expect(trail.getByRole("link", { name: AUTHOR_NAME })).toHaveAttribute("href", AUTHOR_PATH);
  await expect(trail.getByText("Произведения")).toHaveAttribute("aria-current", "page");

  await main.getByRole("link", { name: "Осенний сад" }).click();

  await expect(page).toHaveURL(POEM_PATH);
  await expect(main.getByRole("img", { name: "Иллюстрация: Осенний сад" })).toBeVisible();
  await expect(main.getByRole("heading", { level: 1, name: "Осенний сад" })).toBeVisible();
  await expect(main.locator("time")).toHaveAttribute("datetime", "2026-03-12");
  await expect(main.locator("time")).toHaveText("12 марта 2026 г.");
  await expect(main.getByText(/^Жанр: /)).toBeVisible();
  await expect(trail.getByText("Осенний сад")).toHaveAttribute("aria-current", "page");

  await trail.getByRole("link", { name: "Произведения" }).click();
  await expect(page).toHaveURL(POEMS_PATH);
  await expect(main.getByRole("heading", { level: 1, name: "Произведения" })).toBeVisible();
});

// implements FR-6 of add-author-poems: a signed-out visitor opens a poem page directly, with no redirect.
test("a signed-out visitor opens a poem page directly", {
  tag: ["@add-author-poems"],
}, async ({ page }) => {
  const response = await page.goto(POEM_PATH);

  expect(response?.ok()).toBe(true);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL(POEM_PATH);
  await expect(page.getByRole("banner").getByRole("link", { name: "Войти" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Осенний сад" })).toBeVisible();
});
