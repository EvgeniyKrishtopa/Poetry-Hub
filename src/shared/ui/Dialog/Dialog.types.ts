import type { ReactNode, RefObject } from "react";

export interface DialogProps {
  /** The native dialog, so the caller opens it with `showModal()` and closes it with `close()`. */
  readonly ref: RefObject<HTMLDialogElement | null>;
  /** The heading the dialog is labelled by. */
  readonly title: string;
  /** A muted line under the heading; nothing is rendered without it. */
  readonly description?: string;
  /** The accessible name of the corner close button. */
  readonly closeLabel: string;
  /** Runs after the dialog closes, whatever closed it (the corner button, the backdrop, Escape, or the caller). */
  readonly onClose?: () => void;
  /**
   * `false` while the dialog must stay open (a request is running): the corner button is disabled, the
   * backdrop and Escape do nothing, and a close that happens anyway re-opens it at once without calling
   * `onClose` — the caller's own `close()` included, so set it back to `true` first. Defaults to `true`.
   */
  readonly closable?: boolean;
  readonly children: ReactNode;
}
