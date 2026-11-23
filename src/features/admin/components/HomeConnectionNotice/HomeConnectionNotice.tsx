"use client";

import { useConnection } from "@/shared/lib/network/use-connection";
import { ConnectionNotice } from "@/shared/ui";

/** The offline or slow notice above the two lists; the lists read the same status to disable their controls (FR-9). */
export function HomeConnectionNotice() {
  const { status } = useConnection();

  return <ConnectionNotice status={status} />;
}
