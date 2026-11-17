export interface ViolationDropLinkProps {
  readonly href: string;
  /** Offline: dropping adds nobody, so the target is disabled. */
  readonly disabled: boolean;
}
