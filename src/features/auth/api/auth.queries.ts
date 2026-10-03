import { queryOptions } from "@tanstack/react-query";

import { getSignedInEmail } from "./auth.api";

export const authKeys = {
  session: () => ["auth", "session"] as const,
};

/** Never prefetched on the server: `/` must render the same for every reader (design D5/D6). */
// implements FR-7 of add-supabase-auth
export const sessionQueryOptions = queryOptions({
  queryKey: authKeys.session(),
  queryFn: getSignedInEmail,
});
