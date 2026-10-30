import type { AlertProps, AlertTone } from "./Alert.types";

// Errors interrupt (announced immediately); success and neutral notices are polite.
const TONE_ROLE = {
  danger: "alert",
  success: "status",
  neutral: "status",
} as const satisfies Record<AlertTone, string>;

const TONE_BORDER = {
  danger: "border-danger",
  success: "border-success",
  neutral: "border-muted",
} as const satisfies Record<AlertTone, string>;

// The tone colours only the border: danger text on surface is 4.39:1 in the light theme, below AA,
// so the body stays foreground (design D3).
const BASE_CLASSES = "rounded-md border-l-4 bg-surface px-3 py-2 text-sm font-medium text-foreground";

/** A feedback box for an error, a success, or a neutral notice. Safe in Server and Client Components. */
// implements NFR-2 of add-feedback-color-tokens: token utilities only
export function Alert({ tone, children, className }: AlertProps) {
  const classes = [BASE_CLASSES, TONE_BORDER[tone], className].filter(Boolean).join(" ");

  return (
    <div role={TONE_ROLE[tone]} className={classes}>
      {children}
    </div>
  );
}
