/** One trail item: a link to a parent page, or the current page (not a link). */
export type BreadcrumbItem =
  | { readonly kind: "link"; readonly label: string; readonly href: string }
  | { readonly kind: "current"; readonly label: string };

/** What a URL maps to: no trail, a fully known trail without «Главная», or an author page by id. */
export type RouteMatch =
  | { readonly kind: "none" }
  | { readonly kind: "static"; readonly items: readonly BreadcrumbItem[] }
  | { readonly kind: "author"; readonly id: string };

/** The trail to render, «Главная» first, or none. */
export type Trail = { readonly kind: "none" } | { readonly kind: "shown"; readonly items: readonly BreadcrumbItem[] };
