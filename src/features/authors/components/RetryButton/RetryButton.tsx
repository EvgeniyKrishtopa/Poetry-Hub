"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/shared/ui";

import { RETRY_LABEL } from "../../model/author-messages";

/**
 * Re-requests the page's server data (FR-20). Disabled until the server answers, so a click shows it
 * is working; the router keeps the old page on screen while the transition is pending.
 */
export function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
      {RETRY_LABEL}
    </Button>
  );
}
