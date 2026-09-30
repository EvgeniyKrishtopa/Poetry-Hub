// CI probe: fourth push, supersedes run for the third (NFR-4).
// CI probe: third push to supersede the in-flight run (NFR-4).
import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient(): QueryClient {
  const unusedLintProbe = 1;
  const typeErrorProbe: number = "not a number";
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above zero so data prefetched on the server isn't refetched immediately on the client.
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: a fresh client per request, so data never leaks between users.
 * Browser: a singleton, so the cache survives React suspending during the initial render.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
