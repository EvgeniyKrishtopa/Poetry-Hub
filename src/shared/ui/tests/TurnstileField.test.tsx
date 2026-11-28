import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TurnstileField } from "../TurnstileField/TurnstileField";
import type { TurnstileFieldHandle } from "../TurnstileField/TurnstileField.types";
import { TURNSTILE_GROUP_LABEL, TURNSTILE_UNAVAILABLE_MESSAGE } from "../ui-messages";

import { FAKE_SITE_KEY, installFakeTurnstile } from "./fake-turnstile";

// By attribute: a hidden element has no accessible name to query by.
const block = () => document.querySelector("[data-turnstile]");

// implements FR-5, FR-6, NFR-6 of pre-deploy-security-hardening
describe("TurnstileField", () => {
  const turnstile = installFakeTurnstile({ autoPass: false });

  async function renderWidget() {
    const onTokenChange = vi.fn<(token: string | null) => void>();
    const ref = createRef<TurnstileFieldHandle>();
    const view = render(<TurnstileField ref={ref} onTokenChange={onTokenChange} />);
    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    return { onTokenChange, ref, view };
  }

  it("renders one widget with the site key, in Russian and without Cloudflare's hidden input", async () => {
    await renderWidget();

    expect(turnstile.render).toHaveBeenCalledOnce();
    expect(turnstile.options()).toMatchObject({ sitekey: FAKE_SITE_KEY, language: "ru", "response-field": false });
    expect(screen.getByRole("group", { name: TURNSTILE_GROUP_LABEL })).toBe(block());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a token, and drops it when it expires or times out", async () => {
    const { onTokenChange } = await renderWidget();

    act(() => turnstile.options().callback("fresh"));
    expect(onTokenChange).toHaveBeenLastCalledWith("fresh");

    act(() => turnstile.options()["expired-callback"]());
    expect(onTokenChange).toHaveBeenLastCalledWith(null);

    act(() => turnstile.options().callback("next"));
    act(() => turnstile.options()["timeout-callback"]());
    expect(onTokenChange).toHaveBeenLastCalledWith(null);
  });

  it("drops the token and asks Cloudflare for a new one on reset", async () => {
    const { onTokenChange, ref } = await renderWidget();

    act(() => ref.current?.reset());

    expect(onTokenChange).toHaveBeenLastCalledWith(null);
    expect(turnstile.reset).toHaveBeenCalledWith("0");
  });

  it("shows the notice in place of the block when the widget fails, and brings the block back on a later success", async () => {
    const { onTokenChange } = await renderWidget();

    let handled: boolean | undefined;
    act(() => {
      handled = turnstile.options()["error-callback"]();
    });

    expect(handled).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent(TURNSTILE_UNAVAILABLE_MESSAGE);
    expect(block()).not.toBeVisible();
    expect(onTokenChange).toHaveBeenLastCalledWith(null);

    act(() => turnstile.options().callback("retried"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(block()).toBeVisible();
  });

  it("shows the notice for a browser Turnstile does not support", async () => {
    await renderWidget();

    act(() => turnstile.options()["unsupported-callback"]());

    expect(screen.getByRole("alert")).toHaveTextContent(TURNSTILE_UNAVAILABLE_MESSAGE);
  });

  it("removes the widget and its token on unmount", async () => {
    const { onTokenChange, view } = await renderWidget();

    view.unmount();

    expect(turnstile.remove).toHaveBeenCalledWith("0");
    expect(onTokenChange).toHaveBeenLastCalledWith(null);
  });

  it.each([
    ["no site key", () => vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "")],
    [
      "a render that throws",
      () =>
        turnstile.render.mockImplementation(() => {
          throw new Error("bad key");
        }),
    ],
    ["a render that returns no widget", () => turnstile.render.mockImplementation(() => undefined)],
  ])("shows the notice with %s", async (_case, arrange) => {
    arrange();

    render(<TurnstileField onTokenChange={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(TURNSTILE_UNAVAILABLE_MESSAGE);
  });

  it("carries the notice in the server-rendered page for a browser without JavaScript", () => {
    const html = renderToStaticMarkup(<TurnstileField onTokenChange={() => {}} />);

    const [, noscript] = html.split("<noscript>");
    expect(noscript).toContain(TURNSTILE_UNAVAILABLE_MESSAGE);
    expect(noscript).toContain('role="alert"');
  });
});

describe("TurnstileField without Cloudflare's script", () => {
  const scripts = () => document.head.querySelectorAll<HTMLScriptElement>('script[src*="turnstile"]');

  afterEach(() => {
    delete window.turnstile;
    for (const script of scripts()) script.remove();
    vi.unstubAllEnvs();
  });

  it("shows the notice when the script is blocked, and asks again on the next mount", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", FAKE_SITE_KEY);

    const first = render(<TurnstileField onTokenChange={vi.fn()} />);
    expect(scripts()).toHaveLength(1);
    act(() => {
      scripts()[0]?.dispatchEvent(new Event("error"));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(TURNSTILE_UNAVAILABLE_MESSAGE);
    expect(scripts()).toHaveLength(0);
    first.unmount();

    render(<TurnstileField onTokenChange={vi.fn()} />);
    expect(scripts()).toHaveLength(1);
    act(() => {
      scripts()[0]?.dispatchEvent(new Event("load"));
    });
    // Loaded, yet no `window.turnstile`: still no way to a token.
    expect(await screen.findByRole("alert")).toHaveTextContent(TURNSTILE_UNAVAILABLE_MESSAGE);
  });

  it("loads the script once for two widgets and renders both when it arrives", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", FAKE_SITE_KEY);
    const renderMock = vi.fn(() => "0");

    render(
      <>
        <TurnstileField onTokenChange={vi.fn()} />
        <TurnstileField onTokenChange={vi.fn()} />
      </>,
    );
    expect(scripts()).toHaveLength(1);
    window.turnstile = { render: renderMock, reset: vi.fn(), remove: vi.fn() };
    act(() => {
      scripts()[0]?.dispatchEvent(new Event("load"));
    });

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
  });
});
