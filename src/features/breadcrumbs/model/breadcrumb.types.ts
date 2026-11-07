/** One trail item: a link to a parent page, or the current page (not a link). */
export type BreadcrumbItem =
  | { readonly kind: "link"; readonly label: string; readonly href: string }
  | { readonly kind: "current"; readonly label: string };

/**
 * What a URL maps to: no trail, a fully known trail without the home item, an author page by id, one of
 * the author's poems, the signed-in owner's page of one poem or its edit page, or the owner's page of one
 * collection, its edit page, or its poems page.
 */
export type RouteMatch =
  | { readonly kind: "none" }
  | { readonly kind: "static"; readonly items: readonly BreadcrumbItem[] }
  | { readonly kind: "author"; readonly id: string }
  | { readonly kind: "author-poem"; readonly authorId: string; readonly poemId: string }
  | { readonly kind: "own-poem"; readonly poemId: string }
  | { readonly kind: "own-poem-edit"; readonly poemId: string }
  | { readonly kind: "own-collection"; readonly collectionId: string }
  | { readonly kind: "own-collection-edit"; readonly collectionId: string }
  | { readonly kind: "own-collection-poems"; readonly collectionId: string };

/** The trail to render, «Главная» first, or none. */
export type Trail = { readonly kind: "none" } | { readonly kind: "shown"; readonly items: readonly BreadcrumbItem[] };
