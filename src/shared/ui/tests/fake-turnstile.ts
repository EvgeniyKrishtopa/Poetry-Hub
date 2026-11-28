import { afterEach, beforeEach, vi } from "vitest";

import type { TurnstileApi, TurnstileRenderOptions } from "../TurnstileField/turnstile-api.types";

export const FAKE_SITE_KEY = "1x00000000000000000000AA";

export interface FakeTurnstile {
  /** Every token issued so far, oldest first; each is issued once. */
  readonly issued: string[];
  readonly render: ReturnType<typeof vi.fn<TurnstileApi["render"]>>;
  readonly reset: ReturnType<typeof vi.fn<TurnstileApi["reset"]>>;
  readonly remove: ReturnType<typeof vi.fn<TurnstileApi["remove"]>>;
  /** The options of the newest widget, to call its callbacks by hand. */
  readonly options: () => TurnstileRenderOptions;
}

/**
 * Stands in for Cloudflare in the calling test file: every rendered or reset widget gets a new token on the next
 * microtask, so a form's submit control becomes enabled as it does with the test keys.
 * `autoPass: false` issues none, for the states before a check passes.
 */
export function installFakeTurnstile({ autoPass = true }: { readonly autoPass?: boolean } = {}): FakeTurnstile {
  const issued: string[] = [];
  const widgets: TurnstileRenderOptions[] = [];
  const render = vi.fn<TurnstileApi["render"]>();
  const reset = vi.fn<TurnstileApi["reset"]>();
  const remove = vi.fn<TurnstileApi["remove"]>();

  function pass(options: TurnstileRenderOptions): void {
    if (!autoPass) return;
    // No `act`: Cloudflare calls back from outside React, and an `act` opened from here would nest inside the one a
    // test's click or wait holds and stall a pending form action. A microtask, so faked timers do not hold it back.
    queueMicrotask(() => {
      const token = `token-${issued.length + 1}`;
      issued.push(token);
      options.callback(token);
    });
  }

  beforeEach(() => {
    issued.length = 0;
    widgets.length = 0;
    render.mockImplementation((_container, options) => {
      widgets.push(options);
      pass(options);
      return String(widgets.length - 1);
    });
    reset.mockImplementation((widgetId) => {
      const options = widgets[Number(widgetId)];
      if (options) pass(options);
    });
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", FAKE_SITE_KEY);
    window.turnstile = { render, reset, remove };
  });

  afterEach(() => {
    delete window.turnstile;
    render.mockReset();
    reset.mockReset();
    remove.mockReset();
    vi.unstubAllEnvs();
  });

  function options(): TurnstileRenderOptions {
    const newest = widgets.at(-1);
    if (newest === undefined) throw new Error("no widget rendered");
    return newest;
  }

  return { issued, render, reset, remove, options };
}
