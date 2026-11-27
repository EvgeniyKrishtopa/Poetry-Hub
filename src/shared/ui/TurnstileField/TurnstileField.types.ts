import type { Ref } from "react";

export interface TurnstileFieldHandle {
  /** Drops the used token and asks for a new one. */
  readonly reset: () => void;
}

export interface TurnstileFieldProps {
  /** `null` while there is no usable token: not passed yet, expired, failed or reset. */
  readonly onTokenChange: (token: string | null) => void;
  readonly ref?: Ref<TurnstileFieldHandle>;
}
