// pages: /authors/10000000-0000-4000-8000-000000000005/poems/nope, /authors/10000000-0000-4000-8000-000000000005/poems/OSENNIY-SAD, /authors/10000000-0000-4000-8000-000000000005/poems, /authors/00000000-0000-4000-8000-000000000000/poems, /authors/not-a-uuid/poems
import { expect, test } from "@playwright/test";

/** `author5@example.test` in `supabase/seed.sql`, a public author with four mock poems. */
const AUTHOR_ID = "10000000-0000-4000-8000-000000000005";
/** A valid UUID that names no profile. */
const UNKNOWN_AUTHOR_ID = "00000000-0000-4000-8000-000000000000";

const HTTP_NOT_FOUND = 404;

/** Unknown or differently cased poem ids: the 404 page, its status may be a streamed 200. */
const POEM_NOT_FOUND_PATHS = [`/authors/${AUTHOR_ID}/poems/nope`, `/authors/${AUTHOR_ID}/poems/OSENNIY-SAD`];

/** The removed poem list route, for a public, an unknown, and a malformed author id. */
const POEM_LIST_PATHS = [`/authors/${AUTHOR_ID}/poems`, `/authors/${UNKNOWN_AUTHOR_ID}/poems`, "/authors/not-a-uuid/poems"];

// implements FR-5 of add-author-poems: an unknown poem or a differently cased poem id renders the 404
// page. The status isn't checked: the spec allows a streamed 200.
for (const path of POEM_NOT_FOUND_PATHS) {
  test(`${path} renders the not-found page with no trail`, {
    tag: ["@add-author-poems", "@refine-author-page-and-contact"],
  }, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toHaveCount(0);
  });
}

// implements FR-6 of refine-author-page-and-contact: the former list URL has no page, so it answers HTTP 404.
for (const path of POEM_LIST_PATHS) {
  test(`${path} answers 404 with the not-found page and no trail`, {
    tag: ["@add-author-poems", "@refine-author-page-and-contact"],
  }, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(HTTP_NOT_FOUND);
    await expect(page.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toHaveCount(0);
  });
}
