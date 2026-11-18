/** The signed-in reader's account area; every page under it needs a session (FR-19). */
export const ACCOUNT_PATH = "/account";

export const SIGN_IN_PATH = "/login";

export const SIGN_UP_PATH = "/signup";

/** Whether the proxy gates this path: the account page and anything under it, never `/accounts`. */
export function isAccountPath(pathname: string): boolean {
  return pathname === ACCOUNT_PATH || pathname.startsWith(`${ACCOUNT_PATH}/`);
}

/** The author's poem management area (add-poem-creation design D9); `isAccountPath` already gates it. */
export const POEM_MANAGEMENT_PATH = "/account/poems";

/**
 * The admin page (admin-moderation design D9, D14). It lives here, not in `features/admin`, because
 * `breadcrumbs` needs it for the page's trail and only `src/app/` may import `admin`.
 */
export const ADMIN_PATH = "/admin";

/** The review list under the admin page (admin-violations-feedback design D7); here for the same reason as `ADMIN_PATH`. */
export const ADMIN_VIOLATIONS_PATH = `${ADMIN_PATH}/violations`;
