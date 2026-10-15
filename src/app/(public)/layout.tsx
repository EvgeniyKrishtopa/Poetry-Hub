import type { PropsWithChildren } from "react";

// Pass-through: the root layout owns the shell.
export default function PublicLayout({ children }: PropsWithChildren) {
  return children;
}
