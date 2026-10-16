import { isSignedIn } from "../../dal/is-signed-in";
import { AuthStatus } from "../AuthStatus/AuthStatus";

/** Awaits the session check and passes a plain value down (design D3). Rendered inside `HeaderAuthLinks`'s Suspense. */
export async function HeaderAuthLinksContent() {
  return <AuthStatus signedIn={await isSignedIn()} />;
}
