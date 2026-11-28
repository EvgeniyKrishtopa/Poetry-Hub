import type { TurnstileScriptResult } from "./turnstile-api.types";

const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The load in progress, shared by every widget on the page; cleared once it settles. */
let pendingLoad: Promise<TurnstileScriptResult> | null = null;

function appendScript(): Promise<TurnstileScriptResult> {
  return new Promise((resolve) => {
    const script = document.createElement("script");

    function fail(): void {
      // Removed, so the next widget asks Cloudflare again instead of waiting on a dead element.
      script.remove();
      pendingLoad = null;
      resolve({ ok: false });
    }

    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", () => {
      const api = window.turnstile;
      if (api === undefined) {
        fail();
        return;
      }
      pendingLoad = null;
      resolve({ ok: true, api });
    });
    script.addEventListener("error", fail);
    document.head.append(script);
  });
}

/** Loads Cloudflare's script on first use. A blocked or failed load is `{ ok: false }`, never a rejection. */
export function loadTurnstileScript(): Promise<TurnstileScriptResult> {
  const api = window.turnstile;
  if (api !== undefined) return Promise.resolve({ ok: true, api });

  if (pendingLoad === null) pendingLoad = appendScript();
  return pendingLoad;
}
