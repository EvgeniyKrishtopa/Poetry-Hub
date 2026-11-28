/** The options of Cloudflare's `turnstile.render` that the widget sets. */
export interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly language: string;
  readonly theme: "auto";
  /** `false`: Cloudflare adds no hidden input; the form holds the token itself. */
  readonly "response-field": false;
  readonly callback: (token: string) => void;
  readonly "expired-callback": () => void;
  readonly "timeout-callback": () => void;
  /** Returning `true` tells Turnstile the error is handled. */
  readonly "error-callback": () => boolean;
  readonly "unsupported-callback": () => void;
}

/** The part of Cloudflare's `window.turnstile` the widget calls. */
export interface TurnstileApi {
  readonly render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  readonly reset: (widgetId: string) => void;
  readonly remove: (widgetId: string) => void;
}

export type TurnstileScriptResult = { readonly ok: true; readonly api: TurnstileApi } | { readonly ok: false };

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
