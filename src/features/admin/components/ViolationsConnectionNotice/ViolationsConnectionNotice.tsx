"use client";

import { useConnection } from "@/shared/lib/network/use-connection";
import { ConnectionNotice } from "@/shared/ui";

/** The offline or slow notice above the review list; the rows read the same status to disable their buttons (FR-15). */
export function ViolationsConnectionNotice() {
  const { status } = useConnection();

  return <ConnectionNotice status={status} />;
}
