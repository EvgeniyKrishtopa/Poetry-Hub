import "server-only";

interface TurnstileConfig {
  readonly secretKey: string;
}

export type TurnstileConfigResult = { readonly ok: true; readonly config: TurnstileConfig } | { readonly ok: false };

type TurnstileFailureReason = "config" | "network" | "timeout" | "http" | "rejected";

export type TurnstileVerifyResult = { readonly ok: true } | { readonly ok: false; readonly reason: TurnstileFailureReason };
