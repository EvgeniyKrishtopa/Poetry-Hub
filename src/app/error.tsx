"use client"; // Error boundaries must be Client Components.

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { Button } from "@/shared/ui";

import type { RootErrorProps } from "./error.types";

// implements NFR-1, NFR-3 of add-route-states: design-token utilities only; the only Client Component
// among the route-state screens.
export default function RootError({ error, reset }: RootErrorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Full detail goes to the console, never to the screen.
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Not retry(): it re-fetches only the boundary's children, so the @breadcrumbs slot (a sibling)
  // could keep the failed request's trail. refresh() re-requests page and trail in one payload, and
  // the transition keeps the button disabled until that payload has rendered (design D11).
  function retryRoute() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  // Fixed copy only: error.message can carry internal detail.
  return (
    <main aria-busy={isPending} className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Что-то пошло не так</h1>
      <p className="text-muted">При загрузке страницы произошла непредвиденная ошибка. Попробуйте ещё раз.</p>
      {error.digest && <p className="font-mono text-sm text-muted">Код ошибки: {error.digest}</p>}
      <Button className="self-start" disabled={isPending} onClick={retryRoute}>
        Повторить
      </Button>
    </main>
  );
}
