/** One trail item: a link to a parent page, or the current page (not a link). */
export type BreadcrumbItem =
  | { readonly kind: "link"; readonly label: string; readonly href: string }
  | { readonly kind: "current"; readonly label: string };

/**
 * What a URL maps to: no trail, a fully known trail without the home item, an author page by id, or one
 * of the author's two poem pages.
 */
export type RouteMatch =
  | { readonly kind: "none" }
  | { readonly kind: "static"; readonly items: readonly BreadcrumbItem[] }
  | { readonly kind: "author"; readonly id: string }
  | { readonly kind: "author-poems"; readonly authorId: string }
  | { readonly kind: "author-poem"; readonly authorId: string; readonly poemId: string };

/** The trail to render, «Главная» first, or none. */
export type Trail = { readonly kind: "none" } | { readonly kind: "shown"; readonly items: readonly BreadcrumbItem[] };
