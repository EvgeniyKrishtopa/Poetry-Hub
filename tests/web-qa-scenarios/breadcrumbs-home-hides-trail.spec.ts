// pages: /, /authors
import { expect, test, type Page } from "@playwright/test";

const TRAIL = "Навигационная цепочка";

function trail(page: Page) {
  return page.getByRole("navigation", { name: TRAIL });
}

/** Marks the document, so a full reload (which drops the marker) can be told apart from a client navigation. */
async function markDocument(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __softNav: boolean }).__softNav = true;
  });
}

async function isSameDocument(page: Page) {
  return page.evaluate(() => (window as unknown as { __softNav?: boolean }).__softNav === true);
}

// implements FR-1, FR-7 of add-breadcrumbs: the trail appears when leaving home and is gone when coming back.
test("leaving home shows the trail; the trail's «Главная» and Back both return to a home with no trail", {
  tag: ["@add-breadcrumbs"],
}, async ({ page }) => {
  await page.goto("/");
  await expect(trail(page)).toHaveCount(0);
  await markDocument(page);

  await page.getByRole("banner").getByRole("link", { name: "Наши авторы" }).click();
  await expect(page).toHaveURL("/authors");
  await expect(trail(page).getByRole("listitem")).toHaveText(["Главная", "›Наши авторы"]);

  await trail(page).getByRole("link", { name: "Главная" }).click();
  await expect(page).toHaveURL("/");
  await expect(trail(page)).toHaveCount(0);

  await page.getByRole("banner").getByRole("link", { name: "Наши авторы" }).click();
  await expect(page).toHaveURL("/authors");
  await expect(trail(page)).toHaveCount(1);

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(trail(page)).toHaveCount(0);
  expect(await isSameDocument(page)).toBe(true);
});

// implements FR-7 of add-breadcrumbs: home reached by a client navigation from a directly opened page.
test("from a directly opened page, the trail's «Главная» leads to a home with no trail", {
  tag: ["@add-breadcrumbs"],
}, async ({ page }) => {
  await page.goto("/authors");
  await expect(trail(page)).toHaveCount(1);
  await markDocument(page);

  await trail(page).getByRole("link", { name: "Главная" }).click();
  await expect(page).toHaveURL("/");
  await expect(trail(page)).toHaveCount(0);
  expect(await isSameDocument(page)).toBe(true);
});
