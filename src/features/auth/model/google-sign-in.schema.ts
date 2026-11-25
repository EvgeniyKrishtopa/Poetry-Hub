import { z } from "zod";

import { GOOGLE_FLOW } from "./auth.constants";

/** `startGoogleSignInAction`'s only input: the page the sign-in starts on, a closed set (google-sign-in design D2). */
export const startGoogleSignInSchema = z.object({
  from: z.enum([GOOGLE_FLOW.signIn, GOOGLE_FLOW.signUp]),
});
