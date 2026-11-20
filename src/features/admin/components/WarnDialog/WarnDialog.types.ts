import type { RefObject } from "react";

/** Why the warning stopped for a reason that is about the case, not the send: the row says so and refreshes. */
export type WarnSettleReason = "already-warned" | "wrong-ground" | "case-not-found" | "already-restricted";

/** How a warning dialog ended: the warning went out, or the case turned out not to take one. */
export type WarnSettlement =
  { readonly kind: "sent" } | { readonly kind: "stopped"; readonly reason: WarnSettleReason };

export interface WarnDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly caseId: string;
  /** Filled in and read-only: the admin never types an address. */
  readonly email: string;
  /** Called as the dialog closes after a warning was sent or the case turned out to be warned, changed or gone. */
  readonly onSettled: (settlement: WarnSettlement) => void;
  readonly onClose: () => void;
}
