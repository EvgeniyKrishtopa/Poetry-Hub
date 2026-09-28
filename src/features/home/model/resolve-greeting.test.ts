import { describe, expect, it } from "vitest";

import { siteConfig } from "@/shared/config/site";

import type { GreetingFailureReason } from "./greeting.types";
import { resolveGreeting } from "./resolve-greeting";

describe("resolveGreeting", () => {
  // implements FR-6 of add-contentful-home-greeting
  it("returns the CMS greeting's title and message on success", () => {
    const result = resolveGreeting({
      ok: true,
      greeting: { key: "home", title: "Welcome to Poetry Hub", message: "Hello, reader." },
    });

    expect(result).toEqual({ title: "Welcome to Poetry Hub", message: "Hello, reader." });
  });

  // implements FR-7 of add-contentful-home-greeting
  it.each<GreetingFailureReason>(["config", "network", "auth", "graphql", "http", "validation", "not-found"])(
    "falls back to the static site copy for a `%s` failure",
    (reason) => {
      expect(resolveGreeting({ ok: false, reason })).toEqual({
        title: siteConfig.name,
        message: siteConfig.description,
      });
    },
  );
});
