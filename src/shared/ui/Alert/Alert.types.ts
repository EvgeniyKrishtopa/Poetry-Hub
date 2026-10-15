import type { ReactNode } from "react";

export type AlertTone = "danger" | "success";

export interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  /** Layout utilities only (e.g. `flex flex-col gap-2`); a colour or border class would fight the tone. */
  className?: string;
}
