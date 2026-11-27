// implements FR-15 of pre-deploy-security-hardening
import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config", () => {
  it("does not name the framework in responses", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
