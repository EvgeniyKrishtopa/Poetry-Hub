"use client";

import { createContext, useContext } from "react";

import type { DraggedUser } from "../../model/violation.types";

/** What a user row of the `/admin` list may do with the review list: ask to add its user, or find it unavailable. */
export interface ViolationAdd {
  readonly requestAdd: (user: DraggedUser) => void;
  /** Offline: the handle and the add button are disabled, since nothing could be sent. */
  readonly disabled: boolean;
}

/** `null` outside `ViolationDndArea`: a row rendered elsewhere has no add controls. */
export const ViolationAddContext = createContext<ViolationAdd | null>(null);

export function useViolationAdd(): ViolationAdd | null {
  return useContext(ViolationAddContext);
}
