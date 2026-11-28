"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState } from "react";

import { Alert } from "../Alert/Alert";
import { TURNSTILE_GROUP_LABEL, TURNSTILE_UNAVAILABLE_MESSAGE } from "../ui-messages";

import { loadTurnstileScript } from "./load-turnstile-script";
import type { TurnstileApi } from "./turnstile-api.types";
import type { TurnstileFieldProps } from "./TurnstileField.types";

const WIDGET_LANGUAGE = "ru";

interface RenderedWidget {
  readonly api: TurnstileApi;
  readonly widgetId: string;
}

/**
 * The captcha block of the sign-in, sign-up and contact forms. It loads Cloudflare's script when mounted, so a form
 * mounts it only while it is in use. When no token can be had, a danger alert stands in place of the block.
 */
// implements NFR-6 of pre-deploy-security-hardening: token utilities only, no color literals
export function TurnstileField({ onTokenChange, ref }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<RenderedWidget | null>(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        onTokenChange(null);
        const widget = widgetRef.current;
        if (widget !== null) widget.api.reset(widget.widgetId);
      },
    }),
    [onTokenChange],
  );

  const reportToken = useEffectEvent((token: string) => {
    setFailed(false);
    onTokenChange(token);
  });
  const dropToken = useEffectEvent(() => onTokenChange(null));
  const reportFailure = useEffectEvent(() => {
    setFailed(true);
    onTokenChange(null);
  });

  useEffect(() => {
    let unmounted = false;

    async function renderWidget(): Promise<void> {
      const script = await loadTurnstileScript();
      const container = containerRef.current;
      if (unmounted || container === null) return;
      // A literal access: Next inlines only those into the browser bundle.
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!script.ok || !siteKey) {
        reportFailure();
        return;
      }

      const { api } = script;
      try {
        const widgetId = api.render(container, {
          sitekey: siteKey,
          language: WIDGET_LANGUAGE,
          theme: "auto",
          "response-field": false,
          callback: (token) => reportToken(token),
          "expired-callback": () => dropToken(),
          "timeout-callback": () => dropToken(),
          "error-callback": () => {
            reportFailure();
            return true;
          },
          "unsupported-callback": () => reportFailure(),
        });
        if (widgetId === undefined) reportFailure();
        else widgetRef.current = { api, widgetId };
      } catch {
        // `render` throws on a malformed site key.
        reportFailure();
      }
    }
    void renderWidget();

    return () => {
      unmounted = true;
      const widget = widgetRef.current;
      widgetRef.current = null;
      if (widget !== null) widget.api.remove(widget.widgetId);
      // A removed widget's token must not stay in the form.
      dropToken();
    };
  }, []);

  return (
    <>
      {failed && <Alert tone="danger">{TURNSTILE_UNAVAILABLE_MESSAGE}</Alert>}
      {/* Kept mounted while failed: Turnstile retries by itself, and a later success brings the block back. */}
      <div
        ref={containerRef}
        role="group"
        aria-label={TURNSTILE_GROUP_LABEL}
        data-turnstile=""
        hidden={failed}
        className="h-[65px] w-[300px] max-w-full"
      />
      <noscript>
        {/* Without JavaScript the empty block gives its place to the notice. */}
        <style>{"[data-turnstile]{display:none}"}</style>
        <Alert tone="danger">{TURNSTILE_UNAVAILABLE_MESSAGE}</Alert>
      </noscript>
    </>
  );
}
