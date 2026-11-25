import type { RecoveryRequestResult } from "../../model/auth.types";

/** `RecoveryOffer`'s action state: nothing asked yet, or the request's answer (design D2, D3). */
export type RecoveryOfferState = { readonly status: "idle" } | RecoveryRequestResult;

export interface RecoveryOfferProps {
  /** The sign-in form's current email; the offer sends this and nothing else. */
  readonly email: string;
}
