import type { ReactNode } from "react";

// implements FR-8 of add-route-states: pages anyone can read. Pass-through — the root layout owns the shell.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return children;
}
