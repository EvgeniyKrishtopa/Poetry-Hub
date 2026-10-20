/** The signed-in reader's account area; every page under it needs a session (FR-19). */
export const ACCOUNT_PATH = "/account";

export const SIGN_IN_PATH = "/login";

export const SIGN_UP_PATH = "/signup";

/** Whether the proxy gates this path: the account page and anything under it, never `/accounts`. */
export function isAccountPath(pathname: string): boolean {
  return pathname === ACCOUNT_PATH || pathname.startsWith(`${ACCOUNT_PATH}/`);
}
