import type { RecoveryOfferProps } from "./RecoveryOffer.types";

/**
 * The offer to send a recovery letter, rendered inside the sign-in `<form>` with its own `useActionState` and a
 * button `formAction`; keyed by the sign-in submit count so a stale outcome never outlives the next attempt
 * (password-recovery design D2).
 */
export function RecoveryOffer(props: RecoveryOfferProps): null {
  void props;
  return null;
}
