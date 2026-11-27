export type TotpFactorResult =
  | { readonly ok: true; readonly status: "enrolled"; readonly factorId: string }
  | { readonly ok: true; readonly status: "not-enrolled" }
  | { readonly ok: false; readonly failure: "unavailable" };

export type TotpEnrolmentResult =
  | { readonly ok: true; readonly factorId: string; readonly qrCode: string; readonly secret: string }
  | { readonly ok: false; readonly failure: "unavailable" };

export type TotpVerifyResult =
  { readonly ok: true } | { readonly ok: false; readonly failure: "wrong-code" | "unavailable" };

export type TotpVerifyAllowance = "allowed" | "refused" | "failed";
