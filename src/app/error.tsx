"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";

import { Button } from "@/shared/ui";

interface RootErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

// implements FR-2 of add-route-states: replaces the failing segment inside the root layout.
// implements NFR-1 of add-route-states: design-token utilities only.
// implements NFR-3 of add-route-states: the only Client Component among the route-state screens.
export default function RootError({ error, retry }: RootErrorProps) {
  // implements FR-5 of add-route-states: full detail goes to the console, never to the screen.
  useEffect(() => {
    console.error(error);
  }, [error]);

  // implements FR-3 of add-route-states: fixed copy only — error.message can carry internal detail.
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted">An unexpected error occurred while loading this page. Please try again.</p>
      {error.digest && <p className="font-mono text-sm text-muted">Error reference: {error.digest}</p>}
      {/* implements FR-4 of add-route-states: retry = refetch from the server + reset the boundary. */}
      <Button className="self-start" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
