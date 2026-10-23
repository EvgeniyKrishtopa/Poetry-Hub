export interface ContactFormProps {
  /** Closes the dialog; the success view's close button calls it. */
  readonly onClose: () => void;
  /** Called once when a send succeeds, so the dialog can remount a fresh form after it closes. */
  readonly onSent: () => void;
}
