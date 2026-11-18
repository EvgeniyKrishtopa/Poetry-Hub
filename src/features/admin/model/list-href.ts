import { ADMIN_PATH } from "@/shared/config/account-paths";

import { ADMIN_LIST_PARAM } from "./admin.constants";

/** A list page's URL: the optional cursor, built with `URLSearchParams` so the cursor's `+` survives. */
export function adminListHref(params: { readonly after?: string | null }): string {
  const search = new URLSearchParams();
  if (params.after !== undefined && params.after !== null) search.set(ADMIN_LIST_PARAM.after, params.after);
  const query = search.toString();
  return query === "" ? ADMIN_PATH : `${ADMIN_PATH}?${query}`;
}
