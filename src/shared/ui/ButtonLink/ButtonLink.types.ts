import type Link from "next/link";
import type { ComponentProps } from "react";

import type { ButtonVariant } from "../Button/Button.types";

// With `ref`: a form moves focus to its link (edit-poem FR-3, discard).
export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
}
