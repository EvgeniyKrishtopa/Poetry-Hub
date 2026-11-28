export interface RecoveryOfferProps {
  /** False after a letter was sent: the notice above takes the offer's place and only the button stays. */
  readonly showText: boolean;
  /** A sign-in or a recovery request is pending: the button waits for it. */
  readonly busy: boolean;
  /** The form holds an unused captcha token; a request needs one. */
  readonly captchaReady: boolean;
  /** Asks for a letter for the form's current email; the form owns the action and its result. */
  readonly onRequest: () => void;
}
