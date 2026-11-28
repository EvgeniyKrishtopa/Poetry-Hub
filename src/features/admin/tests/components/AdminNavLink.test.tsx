import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminNavLink } from "../../components/AdminNavLink/AdminNavLink";

const GATE_TEST_ID = "admin-gate";

// The gate has its own tests (AdminOnly.test.tsx); here it is a visible wrapper that lets everything through, so the
// test can tell a link inside the gate from one moved out of it.
vi.mock("../../components/AdminOnly/AdminOnly", () => ({
  AdminOnly: ({ children, includeBeforeSecondFactor }: { children: ReactNode; includeBeforeSecondFactor?: boolean }) => (
    <div data-testid="admin-gate" data-before-second-factor={String(includeBeforeSecondFactor === true)}>
      {children}
    </div>
  ),
}));

afterEach(() => vi.clearAllMocks());

describe("AdminNavLink", () => {
  // implements FR-20 of admin-moderation
  it("is the «Админка» link to /admin, and it sits inside the admin gate, not beside it", () => {
    render(<AdminNavLink />);

    const link = within(screen.getByTestId(GATE_TEST_ID)).getByRole("link", { name: "Админка" });
    expect(link).toHaveAttribute("href", "/admin");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  // implements FR-8 of pre-deploy-security-hardening
  it("asks the gate to show it before the second factor too, since it leads to the code", () => {
    render(<AdminNavLink />);

    expect(screen.getByTestId(GATE_TEST_ID)).toHaveAttribute("data-before-second-factor", "true");
  });
});
