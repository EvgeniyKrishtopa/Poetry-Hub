"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";

import { Button } from "@/shared/ui";

import type { RootErrorProps } from "./error.types";

// implements NFR-1, NFR-3 of add-route-states: design-token utilities only; the only Client Component
// among the route-state screens.
export default function RootError({ error, retry }: RootErrorProps) {
  // Full detail goes to the console, never to the screen.
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Fixed copy only: error.message can carry internal detail.
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Что-то пошло не так</h1>
      <p className="text-muted">При загрузке страницы произошла непредвиденная ошибка. Попробуйте ещё раз.</p>
      {error.digest && <p className="font-mono text-sm text-muted">Код ошибки: {error.digest}</p>}
      {/* retry() refetches from the server and resets the boundary. */}
      <Button className="self-start" onClick={() => retry()}>
        Попробовать снова
      </Button>
    </main>
  );
}
