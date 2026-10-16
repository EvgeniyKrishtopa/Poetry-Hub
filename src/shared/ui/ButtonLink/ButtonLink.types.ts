import type Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import type { ButtonVariant } from "../Button/Button.types";

export interface ButtonLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant;
}
