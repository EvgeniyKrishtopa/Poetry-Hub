import { isSignedIn } from "../../dal/is-signed-in";
import { AuthStatus } from "../AuthStatus/AuthStatus";

/** Awaits the session check and passes a plain value down (design D3). Render it inside a Suspense boundary. */
export async function HeaderSession() {
  return <AuthStatus signedIn={await isSignedIn()} />;
}
