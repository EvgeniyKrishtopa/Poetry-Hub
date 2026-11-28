import { describe, expect, it } from "vitest";

import { groupTotpSecret } from "../../model/group-totp-secret";

describe("groupTotpSecret", () => {
  // implements FR-7 of pre-deploy-security-hardening
  it("splits the secret into groups of four, keeping a shorter last one", () => {
    expect(groupTotpSecret("JBSWY3DPEHPK3PXPAB")).toBe("JBSW Y3DP EHPK 3PXP AB");
    expect(groupTotpSecret("")).toBe("");
  });
});
