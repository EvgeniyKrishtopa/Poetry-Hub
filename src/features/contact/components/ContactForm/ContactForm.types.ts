export interface ContactFormProps {
  /** The captcha loads only while the dialog is open: a closed form asks Cloudflare nothing. */
  readonly isDialogOpen: boolean;
  /** Closes the dialog; the success view's close button calls it. */
  readonly onClose: () => void;
  /** Called once when a send succeeds, so the dialog can remount a fresh form after it closes. */
  readonly onSent: () => void;
}
