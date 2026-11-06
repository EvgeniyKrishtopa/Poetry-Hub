"use client";

import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { ConnectionNotice } from "@/shared/ui";

import type { CollectionActionsProps } from "./CollectionActions.types";

/** The connection notice above the collection page's button row, its children (design D4, D9). */
export function CollectionActions({ children }: CollectionActionsProps) {
  const connection = useConnectionStatus();

  return (
    <>
      {/* Between the description and the buttons, at the page's own gap (artboard 32). */}
      <ConnectionNotice status={connection} />
      <div className="flex flex-wrap items-start gap-2">{children}</div>
    </>
  );
}
