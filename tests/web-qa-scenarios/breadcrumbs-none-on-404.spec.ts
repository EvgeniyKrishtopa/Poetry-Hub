// pages: /no-such-page, /authors/a/b
import { expect, test } from "@playwright/test";

const HTTP_NOT_FOUND = 404;

// implements FR-6 of add-breadcrumbs: a URL with no page keeps its HTTP 404 and shows no trail.
for (const path of ["/no-such-page", "/authors/a/b"]) {
  test(`${path} answers 404 with the not-found page and no breadcrumb trail`, {
    tag: ["@add-breadcrumbs"],
  }, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(HTTP_NOT_FOUND);
    await expect(page.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toHaveCount(0);
  });
}
