// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyWebhookSecret } from "../webhook";

const SECRET = "known-webhook-secret-ABC";

describe("verifyWebhookSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-9 of add-contentful-home-greeting
  describe("with the secret configured", () => {
    it("accepts a matching header", () => {
      vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", SECRET);

      expect(verifyWebhookSecret(SECRET)).toBe("ok");
    });

    it.each([
      ["a wrong value of the same length", SECRET.replace("A", "B")],
      ["a different-length value", `${SECRET}-extra`],
      ["an empty header", ""],
      ["a missing header", null],
    ])("rejects %s", (_label, headerValue) => {
      vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", SECRET);

      expect(verifyWebhookSecret(headerValue)).toBe("unauthorized");
    });
  });

  // implements NFR-1 of add-contentful-home-greeting
  describe("without the secret configured (fails closed)", () => {
    it("is not-configured when the secret is unset", () => {
      vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", undefined);

      expect(verifyWebhookSecret("anything")).toBe("not-configured");
    });

    it("is not-configured when the secret is empty, even for an empty header", () => {
      vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", "");

      expect(verifyWebhookSecret("")).toBe("not-configured");
    });
  });
});
