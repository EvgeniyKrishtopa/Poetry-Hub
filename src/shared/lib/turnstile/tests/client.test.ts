// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstileToken } from "../client";
import {
  TIMEOUT_ERROR_NAME,
  TURNSTILE_REQUEST_TIMEOUT_MS,
  TURNSTILE_SECRET_KEY_ENV,
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_TOKEN_MAX_LENGTH,
} from "../turnstile.constants";

const SECRET = "0x4AAAAAAA-known_secret";
const TOKEN = "known-visitor-token";
const HTTP_OK = 200;
const HTTP_SERVER_ERROR = 500;

const fetchMock = vi.fn<typeof fetch>();

function respond(body: string, status = HTTP_OK): void {
  const response = new Response(body, { status });
  fetchMock.mockResolvedValueOnce(response);
}

// implements FR-6, NFR-2, NFR-3 of pre-deploy-security-hardening
describe("verifyTurnstileToken", () => {
  const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

  beforeEach(() => {
    vi.stubEnv(TURNSTILE_SECRET_KEY_ENV, SECRET);
    vi.stubGlobal("fetch", fetchMock);
    for (const method of ["log", "info", "warn", "error"] as const) {
      consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => {}));
    }
  });

  afterEach(() => {
    // No path logs anything, so neither the token nor the secret can reach a log.
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
    consoleSpies.length = 0;
    fetchMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("POSTs the secret and the token to siteverify with a timeout signal, and accepts `success: true`", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    respond(JSON.stringify({ success: true }));

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: true });
    expect(timeoutSpy).toHaveBeenCalledWith(TURNSTILE_REQUEST_TIMEOUT_MS);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(TURNSTILE_SITEVERIFY_URL);
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toBe(new URLSearchParams({ secret: SECRET, response: TOKEN }).toString());
  });

  it.each([
    ["success: false", JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })],
    ["a truthy non-boolean success", JSON.stringify({ success: "true" })],
    ["no success field", "{}"],
    ["a null body", "null"],
  ])("rejects an answer with %s", async (_case, body) => {
    respond(body);

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: false, reason: "rejected" });
  });

  it.each([
    ["an empty token", ""],
    ["a token longer than Turnstile issues", "x".repeat(TURNSTILE_TOKEN_MAX_LENGTH + 1)],
  ])("rejects %s without a request", async (_case, token) => {
    const result = await verifyTurnstileToken(token);

    expect(result).toEqual({ ok: false, reason: "rejected" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["invalid-input-secret", "missing-input-secret"])("answers config for %s", async (code) => {
    respond(JSON.stringify({ success: false, "error-codes": [code] }));

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: false, reason: "config" });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["without the `x` form", "not-a-secret"],
    ["with whitespace", "0x4AAA two"],
  ])("fails with reason config and sends nothing for a %s secret", async (_case, secret) => {
    vi.stubEnv(TURNSTILE_SECRET_KEY_ENV, secret);

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: false, reason: "config" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers network when the request fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed ${SECRET}`));

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: false, reason: "network" });
  });

  it("answers timeout when the signal fired", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("timed out", TIMEOUT_ERROR_NAME));

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: false, reason: "timeout" });
  });

  it.each([
    ["a non-2xx status", JSON.stringify({ success: true }), HTTP_SERVER_ERROR],
    ["a body that is not JSON", "<html></html>", HTTP_OK],
  ])("answers http for %s", async (_case, body, status) => {
    respond(body, status);

    const result = await verifyTurnstileToken(TOKEN);

    expect(result).toEqual({ ok: false, reason: "http" });
  });
});
