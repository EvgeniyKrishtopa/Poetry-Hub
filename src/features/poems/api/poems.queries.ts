import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchPoems } from "./poems.api";

const poemsKeys = {
  all: ["poems"] as const,
  list: () => [...poemsKeys.all, "list"] as const,
};

/** Shared by client hooks and server-side prefetching, so both use the same key + fetcher. */
export const poemsListQueryOptions = queryOptions({
  queryKey: poemsKeys.list(),
  queryFn: fetchPoems,
});

export function usePoemsQuery() {
  return useQuery(poemsListQueryOptions);
}
