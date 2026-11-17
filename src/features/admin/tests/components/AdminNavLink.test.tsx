import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminNavLink } from "../../components/AdminNavLink/AdminNavLink";
import { AdminOnly } from "../../components/AdminOnly/AdminOnly";

// The gate has its own tests (AdminOnly.test.tsx); here it passes its children through and records its use.
vi.mock("../../components/AdminOnly/AdminOnly", () => ({
  AdminOnly: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
}));

afterEach(() => vi.clearAllMocks());

describe("AdminNavLink", () => {
  // implements FR-20 of admin-moderation
  it("is the «Админка» link to /admin, inside the admin gate", () => {
    render(<AdminNavLink />);

    expect(AdminOnly).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Админка" })).toHaveAttribute("href", "/admin");
  });
});
