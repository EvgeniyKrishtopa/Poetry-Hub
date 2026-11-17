import { getSessionState } from "../../dal/current-user";
import { AuthStatus } from "../AuthStatus/AuthStatus";
import type { HeaderAuthLinksProps } from "../HeaderAuthLinks/HeaderAuthLinks.types";

/** Awaits the session check and passes only its state down, never the user id (design D3). Rendered inside `HeaderAuthLinks`'s Suspense. */
export async function HeaderAuthLinksContent({ adminLink }: HeaderAuthLinksProps = {}) {
  const { state } = await getSessionState();
  return <AuthStatus session={state} adminLink={adminLink} />;
}
