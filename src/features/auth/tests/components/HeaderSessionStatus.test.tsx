import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HeaderSessionStatus } from "../../components/HeaderSessionStatus/HeaderSessionStatus";
import { isSignedIn } from "../../dal/is-signed-in";

vi.mock("../../dal/is-signed-in", () => ({ isSignedIn: vi.fn() }));
vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

describe("HeaderSessionStatus", () => {
  // implements FR-3 of remove-browser-session-read
  it("renders Sign out when the server reports a signed-in reader", async () => {
    vi.mocked(isSignedIn).mockResolvedValue(true);

    render(await HeaderSessionStatus());

    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("renders the Sign in link when the server reports no session", async () => {
    vi.mocked(isSignedIn).mockResolvedValue(false);

    render(await HeaderSessionStatus());

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
