import { getSessionState } from "../../dal/current-user";
import { AuthStatus } from "../AuthStatus/AuthStatus";

/** Awaits the session check and passes only its state down, never the user id (design D3). Rendered inside `HeaderAuthLinks`'s Suspense. */
export async function HeaderAuthLinksContent() {
  const { state } = await getSessionState();
  return <AuthStatus session={state} />;
}
