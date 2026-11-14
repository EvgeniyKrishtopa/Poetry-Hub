import { ADMIN_LIST_PARAM, ADMIN_PATH } from "./admin.constants";

/** A list page's URL: the optional cursor and email filter, built with `URLSearchParams` so the cursor's `+` survives. */
export function adminListHref(params: { readonly after?: string | null; readonly email?: string | undefined }): string {
  const search = new URLSearchParams();
  if (params.after !== undefined && params.after !== null) search.set(ADMIN_LIST_PARAM.after, params.after);
  if (params.email !== undefined && params.email.trim() !== "") search.set(ADMIN_LIST_PARAM.email, params.email);
  const query = search.toString();
  return query === "" ? ADMIN_PATH : `${ADMIN_PATH}?${query}`;
}
